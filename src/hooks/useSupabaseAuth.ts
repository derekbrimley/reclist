import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';

interface UseSupabaseAuthReturn {
  session: Session | null;
  user: User | null;
  spotifyAccessToken: string | null;
  isLoading: boolean;
  error: string | null;
  signInWithSpotify: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store Spotify tokens in the database after sign-in
  const storeSpotifyTokens = useCallback(async (
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    const { error: upsertError } = await supabase
      .from('user_spotify_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Failed to store Spotify tokens:', upsertError);
    }
  }, []);

  // Refresh Spotify access token using the stored refresh token
  const refreshSpotifyToken = useCallback(async (userId: string, refreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      await storeSpotifyTokens(
        userId,
        data.access_token,
        data.refresh_token || refreshToken,
        data.expires_in
      );
      return data.access_token;
    } catch {
      return null;
    }
  }, [storeSpotifyTokens]);

  // Load Spotify token from database
  const loadSpotifyToken = useCallback(async (userId: string): Promise<string | null> => {
    const { data, error: fetchError } = await supabase
      .from('user_spotify_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (fetchError || !data) return null;

    const now = Date.now();
    if (now < data.expires_at) {
      return data.access_token;
    }

    // Token expired — try to refresh
    if (data.refresh_token) {
      return await refreshSpotifyToken(userId, data.refresh_token);
    }

    return null;
  }, [refreshSpotifyToken]);

  // Initialize: get existing session and listen for auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);

          // On initial load, provider_token is null (only available at sign-in time).
          // Load from our database instead.
          const token = await loadSpotifyToken(existingSession.user.id);
          if (mounted) {
            setSpotifyAccessToken(token);
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        // Capture provider tokens (only available immediately after OAuth sign-in)
        if (newSession.provider_token) {
          setSpotifyAccessToken(newSession.provider_token);
          await storeSpotifyTokens(
            newSession.user.id,
            newSession.provider_token,
            newSession.provider_refresh_token || '',
            3600 // Spotify tokens last 1 hour
          );
        } else {
          // Page refresh or token refresh — load from DB
          const token = await loadSpotifyToken(newSession.user.id);
          if (mounted) setSpotifyAccessToken(token);
        }
      }

      if (event === 'SIGNED_OUT') {
        setSpotifyAccessToken(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadSpotifyToken, storeSpotifyTokens]);

  const signInWithSpotify = useCallback(async () => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: window.location.origin,
        scopes: 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private user-library-modify',
      },
    });

    if (signInError) {
      setError(`Sign in failed: ${signInError.message}`);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(`Sign out failed: ${signOutError.message}`);
    }
  }, []);

  return {
    session,
    user,
    spotifyAccessToken,
    isLoading,
    error,
    signInWithSpotify,
    signOut,
  };
}
