// Supabase Edge Function: generate-listening-guide
// Proxies Claude API calls server-side to keep the Anthropic API key secure.
// Deploy with: supabase functions deploy generate-listening-guide
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface Recommendation {
  type: string;
  name?: string;
  artistName?: string;
  noteText?: string;
}

function buildPrompt(recommendation: Recommendation): string {
  let description = '';

  if (recommendation.type === 'song') {
    description = recommendation.artistName
      ? `"${recommendation.name}" by ${recommendation.artistName}`
      : `"${recommendation.name}"`;
  } else if (recommendation.type === 'album') {
    description = recommendation.artistName
      ? `the album "${recommendation.name}" by ${recommendation.artistName}`
      : `the album "${recommendation.name}"`;
  } else if (recommendation.type === 'artist') {
    description = `music by ${recommendation.name}`;
  } else if (recommendation.noteText) {
    description = `"${recommendation.noteText}"`;
  } else if (recommendation.name) {
    description = recommendation.artistName
      ? `"${recommendation.name}" by ${recommendation.artistName}`
      : `"${recommendation.name}"`;
  } else {
    description = 'this music recommendation';
  }

  let prompt = `I'm listening to ${description}. Can you give me some recommendations on what I should be listening for?`;

  if (recommendation.type === 'album') {
    prompt += ' Please go into specific tracks on the album and what makes each one notable.';
  }

  prompt += '\n\nPlease provide a concise but insightful paragraph (2-4 sentences) that helps me appreciate and understand what I\'m listening to. Focus on musical elements, historical context, or emotional qualities that make this music special.';

  return prompt;
}

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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Parse request body
  const { recommendation } = await req.json();
  if (!recommendation) {
    return new Response(JSON.stringify({ error: 'Missing recommendation in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const prompt = buildPrompt(recommendation);

  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: `Claude API error: ${response.status} - ${errorText}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const data = await response.json();
  const textContent = data.content.find((block: { type: string; text?: string }) => block.type === 'text');

  if (!textContent?.text) {
    return new Response(JSON.stringify({ error: 'No text response from Claude' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(JSON.stringify({ guide: textContent.text }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
