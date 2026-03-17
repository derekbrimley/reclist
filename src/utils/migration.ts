import { supabase } from '../lib/supabase';
import type { Recommendation } from '../types/index';

const LEGACY_STORAGE_KEY = 'reclist_state';
const MIGRATION_FLAG = 'reclist_migrated';

interface LegacyState {
  keeperPlaylistId?: string | null;
  keeperPlaylistName?: string | null;
  artistKeepCount?: number;
  recommendations?: Recommendation[];
}

export async function migrateFromLocalStorage(userId: string): Promise<boolean> {
  // Already migrated
  if (localStorage.getItem(MIGRATION_FLAG)) return false;

  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return false;

  let legacyState: LegacyState;
  try {
    legacyState = JSON.parse(stored);
  } catch {
    return false;
  }

  if (!legacyState.recommendations?.length) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return false;
  }

  // Check if user already has data in Supabase
  const { count } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return false;
  }

  // Upload recommendations to Supabase
  const rows = legacyState.recommendations.map((rec) => ({
    id: rec.id,
    user_id: userId,
    type: rec.type,
    spotify_id: rec.spotifyId || null,
    name: rec.name || null,
    artist_name: rec.artistName || null,
    artwork_url: rec.artworkUrl || null,
    spotify_url: rec.spotifyUrl || null,
    external_url: rec.externalUrl || null,
    external_source: rec.externalSource || null,
    note_text: rec.noteText || null,
    listening_guide: rec.listeningGuide || null,
    created_at: rec.createdAt,
  }));

  const { error: insertError } = await supabase
    .from('recommendations')
    .insert(rows);

  if (insertError) {
    console.error('Migration insert failed:', insertError);
    return false;
  }

  // Upload user settings
  if (legacyState.keeperPlaylistId) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      keeper_playlist_id: legacyState.keeperPlaylistId,
      keeper_playlist_name: legacyState.keeperPlaylistName || null,
      artist_keep_count: legacyState.artistKeepCount ?? 10,
    });
  }

  localStorage.setItem(MIGRATION_FLAG, 'true');
  return true;
}
