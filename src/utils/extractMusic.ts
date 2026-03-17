import type { SearchResult, ExtractedMention } from '../types/index';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text?: string;
  }>;
}

/**
 * Fetches a web page's text content via a CORS proxy, strips HTML,
 * and returns clean text suitable for music extraction.
 */
export async function fetchPageText(url: string): Promise<string> {
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status}). The page may be unavailable or blocking access.`);
  }

  const data = await response.json();
  const html: string = data.contents;

  if (!html) {
    throw new Error('No content returned from page.');
  }

  // Parse HTML and extract text
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove non-content elements
  const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript', 'svg'];
  for (const selector of removeSelectors) {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  }

  // Prefer article/main content if available
  const contentEl = doc.querySelector('article') || doc.querySelector('main') || doc.body;
  const rawText = contentEl?.textContent || '';

  // Collapse whitespace and truncate
  const cleanText = rawText.replace(/\s+/g, ' ').trim();
  const maxLength = 12000;

  if (cleanText.length > maxLength) {
    return cleanText.slice(0, maxLength) + '...';
  }

  return cleanText;
}

/**
 * Also extract any music service URLs directly from the page HTML.
 */
export function extractLinksFromHtml(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links: string[] = [];

  const musicDomains = [
    'open.spotify.com',
    'spotify.link',
    'music.apple.com',
    'youtube.com',
    'youtu.be',
    'bandcamp.com',
  ];

  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && musicDomains.some((domain) => href.includes(domain))) {
      links.push(href);
    }
  });

  return [...new Set(links)];
}

/**
 * Uses the Claude API to extract music recommendations from page text.
 * Returns structured data about each mentioned artist/album/song.
 */
export async function extractMusicMentions(
  pageText: string
): Promise<Array<{ name: string; artistName: string; type: 'song' | 'album' | 'artist' }>> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a music extraction tool. Given the following text from a web page, identify all music that is being recommended, reviewed, or highlighted.

Return a JSON array of objects, each with these fields:
- "name": the track or album title
- "artistName": the artist or band name
- "type": either "song", "album", or "artist"

Rules:
- Only include items that are clearly being recommended, reviewed, or listed as notable. Do not include incidental mentions (e.g., "sounds like Radiohead" should not add Radiohead unless Radiohead's music is itself being recommended).
- When both an album and its individual tracks are mentioned, prefer the album-level entry unless specific tracks are independently highlighted.
- Deduplicate entries.
- Return ONLY the JSON array, no other text or markdown formatting.

Page text:
${pageText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data: ClaudeResponse = await response.json();
  const textContent = data.content.find((block) => block.type === 'text');

  if (!textContent?.text) {
    throw new Error('No response from Claude');
  }

  // Try to parse the JSON response
  try {
    const parsed = JSON.parse(textContent.text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          typeof item.name === 'string' &&
          typeof item.artistName === 'string' &&
          ['song', 'album', 'artist'].includes(item.type)
      );
    }
  } catch {
    // Fallback: try to extract JSON array from the response
    const match = textContent.text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item) =>
              typeof item.name === 'string' &&
              typeof item.artistName === 'string' &&
              ['song', 'album', 'artist'].includes(item.type)
          );
        }
      } catch {
        // Could not parse
      }
    }
  }

  return [];
}

/**
 * Resolves extracted music mentions against Spotify search to get
 * artwork, IDs, and URLs. Batches searches to avoid rate limits.
 */
export async function resolveToSpotify(
  mentions: Array<{ name: string; artistName: string; type: 'song' | 'album' | 'artist' }>,
  searchFn: (term: string) => Promise<SearchResult[]>
): Promise<ExtractedMention[]> {
  const results: ExtractedMention[] = [];
  const batchSize = 3;

  for (let i = 0; i < mentions.length; i += batchSize) {
    const batch = mentions.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (mention) => {
        const query = `${mention.name} ${mention.artistName}`;
        try {
          const searchResults = await searchFn(query);

          // Find the best match - prefer matching type
          const typeMap: Record<string, string> = { song: 'song', album: 'album', artist: 'artist' };
          const expectedType = typeMap[mention.type];
          const bestMatch =
            searchResults.find((r) => r.type === expectedType) || searchResults[0] || undefined;

          return {
            name: mention.name,
            artistName: mention.artistName,
            type: mention.type,
            spotifyMatch: bestMatch,
            selected: true,
          } as ExtractedMention;
        } catch {
          return {
            name: mention.name,
            artistName: mention.artistName,
            type: mention.type,
            spotifyMatch: undefined,
            selected: true,
          } as ExtractedMention;
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}
