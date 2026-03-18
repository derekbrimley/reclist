// Supabase Edge Function: extract-music
// Extracts music recommendations from a web page's text content using Claude.
// Deploy with: supabase functions deploy extract-music
// Requires secret: supabase secrets set ANTHROPIC_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  // Parse request body
  const { pageText } = await req.json();
  if (!pageText || typeof pageText !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing pageText in request body' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  // Call Anthropic API to extract music mentions
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
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
    return new Response(JSON.stringify({ error: `Claude API error: ${response.status} - ${errorText}` }), {
      status: 502,
      headers: CORS_HEADERS,
    });
  }

  const data = await response.json();
  const textContent = data.content.find((block: { type: string; text?: string }) => block.type === 'text');

  if (!textContent?.text) {
    return new Response(JSON.stringify({ error: 'No text response from Claude' }), {
      status: 502,
      headers: CORS_HEADERS,
    });
  }

  // Parse the JSON response from Claude
  let mentions: Array<{ name: string; artistName: string; type: string }> = [];

  try {
    const parsed = JSON.parse(textContent.text);
    if (Array.isArray(parsed)) {
      mentions = parsed.filter(
        (item: { name?: string; artistName?: string; type?: string }) =>
          typeof item.name === 'string' &&
          typeof item.artistName === 'string' &&
          ['song', 'album', 'artist'].includes(item.type ?? '')
      );
    }
  } catch {
    // Fallback: try to extract JSON array from the response
    const match = textContent.text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          mentions = parsed.filter(
            (item: { name?: string; artistName?: string; type?: string }) =>
              typeof item.name === 'string' &&
              typeof item.artistName === 'string' &&
              ['song', 'album', 'artist'].includes(item.type ?? '')
          );
        }
      } catch {
        // Could not parse
      }
    }
  }

  return new Response(JSON.stringify({ mentions }), {
    headers: CORS_HEADERS,
  });
});
