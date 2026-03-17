import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Recommendation } from '../types/index';
import { loadPendingOps, savePendingOps, enqueuePendingOp } from '../utils/pendingOps';
import { migrateFromLocalStorage } from '../utils/migration';

// Convert DB row (snake_case) to Recommendation (camelCase)
function rowToRecommendation(row: Record<string, unknown>): Recommendation {
  return {
    id: row.id as string,
    type: row.type as Recommendation['type'],
    spotifyId: (row.spotify_id as string) || undefined,
    name: (row.name as string) || undefined,
    artistName: (row.artist_name as string) || undefined,
    artworkUrl: (row.artwork_url as string) || undefined,
    spotifyUrl: (row.spotify_url as string) || undefined,
    externalUrl: (row.external_url as string) || undefined,
    externalSource: (row.external_source as Recommendation['externalSource']) || undefined,
    noteText: (row.note_text as string) || undefined,
    listeningGuide: (row.listening_guide as string) || undefined,
    createdAt: row.created_at as string,
  };
}

// Convert Recommendation (camelCase) to DB row (snake_case)
function recommendationToRow(rec: Recommendation, userId: string): Record<string, unknown> {
  return {
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
  };
}

type SyncDispatchAction =
  | { type: 'HYDRATE_FROM_SERVER'; payload: { recommendations: Recommendation[]; settings: { keeperPlaylistId: string | null; keeperPlaylistName: string | null; artistKeepCount: number } } }
  | { type: 'SYNC_ADD'; payload: Recommendation }
  | { type: 'SYNC_REMOVE'; payload: string }
  | { type: 'SYNC_UPDATE'; payload: Recommendation };

interface UseSyncOptions {
  userId: string | null;
  dispatch: (action: SyncDispatchAction) => void;
}

export function useSync({ userId, dispatch }: UseSyncOptions) {
  const recentWriteIds = useRef<Set<string>>(new Set());

  // Initial hydration: fetch all data from Supabase
  useEffect(() => {
    if (!userId) return;

    const hydrate = async () => {
      // Run migration first (one-time, from localStorage)
      await migrateFromLocalStorage(userId);

      // Flush any pending offline operations
      await flushPendingOps(userId);

      // Fetch recommendations
      const { data: recs, error: recsError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (recsError) {
        console.error('Failed to fetch recommendations:', recsError);
      }

      // Fetch user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      dispatch({
        type: 'HYDRATE_FROM_SERVER',
        payload: {
          recommendations: (recs || []).map(rowToRecommendation),
          settings: {
            keeperPlaylistId: settings?.keeper_playlist_id || null,
            keeperPlaylistName: settings?.keeper_playlist_name || null,
            artistKeepCount: settings?.artist_keep_count ?? 10,
          },
        },
      });
    };

    hydrate();
  }, [userId, dispatch]);

  // Subscribe to Realtime for cross-device updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('recommendations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const recId = (payload.new as Record<string, unknown>)?.id as string
            || (payload.old as Record<string, unknown>)?.id as string;

          // Suppress echo from our own writes
          if (recentWriteIds.current.has(recId)) {
            recentWriteIds.current.delete(recId);
            return;
          }

          if (payload.eventType === 'INSERT') {
            dispatch({
              type: 'SYNC_ADD',
              payload: rowToRecommendation(payload.new as Record<string, unknown>),
            });
          } else if (payload.eventType === 'DELETE') {
            dispatch({
              type: 'SYNC_REMOVE',
              payload: (payload.old as Record<string, unknown>).id as string,
            });
          } else if (payload.eventType === 'UPDATE') {
            dispatch({
              type: 'SYNC_UPDATE',
              payload: rowToRecommendation(payload.new as Record<string, unknown>),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, dispatch]);

  // Flush pending ops on reconnection
  useEffect(() => {
    if (!userId) return;

    const handleOnline = () => flushPendingOps(userId);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  const syncAdd = useCallback(
    async (rec: Recommendation) => {
      if (!userId) return;

      recentWriteIds.current.add(rec.id);
      // Clear echo suppression after 5s
      setTimeout(() => recentWriteIds.current.delete(rec.id), 5000);

      const row = recommendationToRow(rec, userId);
      const { error } = await supabase.from('recommendations').insert(row);

      if (error) {
        console.error('Failed to sync add:', error);
        enqueuePendingOp({ type: 'INSERT', table: 'recommendations', data: row });
      }
    },
    [userId]
  );

  const syncRemove = useCallback(
    async (recId: string) => {
      if (!userId) return;

      recentWriteIds.current.add(recId);
      setTimeout(() => recentWriteIds.current.delete(recId), 5000);

      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', recId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to sync remove:', error);
        enqueuePendingOp({ type: 'DELETE', table: 'recommendations', data: { id: recId, user_id: userId } });
      }
    },
    [userId]
  );

  const syncUpdate = useCallback(
    async (rec: Recommendation) => {
      if (!userId) return;

      recentWriteIds.current.add(rec.id);
      setTimeout(() => recentWriteIds.current.delete(rec.id), 5000);

      const row = recommendationToRow(rec, userId);
      const { error } = await supabase
        .from('recommendations')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', rec.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to sync update:', error);
        enqueuePendingOp({ type: 'UPDATE', table: 'recommendations', data: row });
      }
    },
    [userId]
  );

  const syncSettings = useCallback(
    async (settings: { keeperPlaylistId: string; keeperPlaylistName: string }) => {
      if (!userId) return;

      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        keeper_playlist_id: settings.keeperPlaylistId,
        keeper_playlist_name: settings.keeperPlaylistName,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to sync settings:', error);
      }
    },
    [userId]
  );

  const syncClearAll = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to sync clear all:', error);
    }
  }, [userId]);

  return { syncAdd, syncRemove, syncUpdate, syncSettings, syncClearAll };
}

async function flushPendingOps(userId: string) {
  const ops = loadPendingOps();
  if (ops.length === 0) return;

  const remaining = [...ops];

  for (const op of ops) {
    let success = false;

    if (op.table === 'recommendations') {
      if (op.type === 'INSERT') {
        const { error } = await supabase.from('recommendations').insert(op.data);
        success = !error;
      } else if (op.type === 'DELETE') {
        const { error } = await supabase
          .from('recommendations')
          .delete()
          .eq('id', op.data.id)
          .eq('user_id', userId);
        success = !error;
      } else if (op.type === 'UPDATE') {
        const { error } = await supabase
          .from('recommendations')
          .update({ ...op.data, updated_at: new Date().toISOString() })
          .eq('id', op.data.id)
          .eq('user_id', userId);
        success = !error;
      }
    }

    if (success) {
      const idx = remaining.findIndex((o) => o.id === op.id);
      if (idx !== -1) remaining.splice(idx, 1);
    }
  }

  savePendingOps(remaining);
}
