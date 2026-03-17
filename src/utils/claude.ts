import type { Recommendation } from '../types/index';
import { supabase } from '../lib/supabase';

export async function generateListeningGuide(recommendation: Recommendation): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be signed in to generate a listening guide.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-listening-guide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      recommendation: {
        type: recommendation.type,
        name: recommendation.name,
        artistName: recommendation.artistName,
        noteText: recommendation.noteText,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to generate listening guide: ${response.status}`);
  }

  const data = await response.json();
  return data.guide;
}
