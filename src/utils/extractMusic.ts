import type { SearchResult, ExtractedMention } from '../types/index';
import { supabase } from '../lib/supabase';

const CORS_PROXY = 'https://api.allorigins.win/get?url=';

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
 * Uses a Supabase edge function (backed by Claude) to extract music
 * recommendations from page text. Returns structured data about each
 * mentioned artist/album/song.
 */
export async function extractMusicMentions(
  pageText: string
): Promise<Array<{ name: string; artistName: string; type: 'song' | 'album' | 'artist' }>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be signed in to extract music from pages.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/extract-music`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ pageText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to extract music: ${response.status}`);
  }

  const data = await response.json();
  return data.mentions || [];
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
          const expectedType = mention.type;
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
