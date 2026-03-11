import { useEffect, useState, useCallback } from 'react';
import type { Playlist, SearchResult } from '../types/index';

// Spotify types
interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[] | null;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] | null };
  external_urls: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[] | null;
  external_urls: { spotify: string };
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[] | null;
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  tracks?: { items: SpotifyTrack[] };
  albums?: { items: SpotifyAlbum[] };
  artists?: { items: SpotifyArtist[] };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// Get environment variables
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '';

// OAuth PKCE helpers
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64urlencode(hashed);
}

export function useSpotify() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize - check for existing token
  useEffect(() => {
    if (!CLIENT_ID || !REDIRECT_URI) {
      setError('Spotify client ID or redirect URI not configured');
      setIsLoading(false);
      return;
    }

    setIsConfigured(true);

    // Check for stored tokens
    const storedToken = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_token_expires_at');

    if (storedToken && expiresAt) {
      const now = Date.now();
      if (now < parseInt(expiresAt)) {
        setAccessToken(storedToken);
        setIsAuthorized(true);
      } else {
        // Token expired, try to refresh
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (refreshToken) {
          refreshAccessToken(refreshToken);
        }
      }
    }

    setIsLoading(false);
  }, []);

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data: TokenResponse = await response.json();
      storeTokens(data);
      setAccessToken(data.access_token);
      setIsAuthorized(true);
    } catch (e) {
      setError(`Token refresh failed: ${e}`);
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_token_expires_at');
      setIsAuthorized(false);
    }
  };

  const storeTokens = (data: TokenResponse) => {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
  };

  const authorize = useCallback(async () => {
    if (!isConfigured) return false;

    try {
      // Generate PKCE challenge
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier for later
      localStorage.setItem('spotify_code_verifier', codeVerifier);

      // Redirect to Spotify authorization
      const scope = [
        'user-read-private',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-modify',
      ].join(' ');

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', CLIENT_ID);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('scope', scope);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('code_challenge', codeChallenge);

      window.location.href = authUrl.toString();
      return true;
    } catch (e) {
      setError(`Authorization failed: ${e}`);
      return false;
    }
  }, [isConfigured]);

  const handleCallback = useCallback(async (code: string): Promise<boolean> => {
    try {
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data: TokenResponse = await response.json();
      storeTokens(data);
      setAccessToken(data.access_token);
      setIsAuthorized(true);

      // Clean up code verifier
      localStorage.removeItem('spotify_code_verifier');

      return true;
    } catch (e) {
      setError(`Callback handling failed: ${e}`);
      return false;
    }
  }, []);

  const unauthorize = useCallback(async () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
    setAccessToken(null);
    setIsAuthorized(false);
  }, []);

  const getPlaylists = useCallback(async (): Promise<Playlist[]> => {
    if (!accessToken || !isAuthorized) return [];

    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      return data.items.map((p: SpotifyPlaylist) => ({
        id: p.id,
        name: p.name,
        artworkUrl: p.images?.[0]?.url,
      }));
    } catch (e) {
      setError(`Failed to fetch playlists: ${e}`);
      return [];
    }
  }, [accessToken, isAuthorized]);

  const search = useCallback(
    async (term: string): Promise<SearchResult[]> => {
      if (!accessToken || !term.trim()) return [];

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=track,album,artist&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data: SpotifySearchResponse = await response.json();
        const results: SearchResult[] = [];

        // Tracks
        data.tracks?.items.forEach((track) => {
          results.push({
            id: track.id,
            type: 'song',
            name: track.name,
            artistName: track.artists.map((a) => a.name).join(', '),
            artworkUrl: track.album.images?.[0]?.url,
            spotifyUrl: track.external_urls.spotify,
          });
        });

        // Albums
        data.albums?.items.forEach((album) => {
          results.push({
            id: album.id,
            type: 'album',
            name: album.name,
            artistName: album.artists.map((a) => a.name).join(', '),
            artworkUrl: album.images?.[0]?.url,
            spotifyUrl: album.external_urls.spotify,
          });
        });

        // Artists
        data.artists?.items.forEach((artist) => {
          results.push({
            id: artist.id,
            type: 'artist',
            name: artist.name,
            artistName: '',
            artworkUrl: artist.images?.[0]?.url,
            spotifyUrl: artist.external_urls.spotify,
          });
        });

        return results;
      } catch (e) {
        setError(`Search failed: ${e}`);
        return [];
      }
    },
    [accessToken]
  );

  const addToPlaylist = useCallback(
    async (playlistId: string, trackUris: string | string[]): Promise<boolean> => {
      if (!accessToken || !isAuthorized) return false;

      const uris = Array.isArray(trackUris) ? trackUris : [trackUris];

      try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add to playlist');
        }

        return true;
      } catch (e) {
        setError(`Failed to add to playlist: ${e}`);
        return false;
      }
    },
    [accessToken, isAuthorized]
  );

  const getAlbumTracks = useCallback(
    async (albumId: string): Promise<string[]> => {
      if (!accessToken || !isAuthorized) return [];

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch album tracks');
        }

        const data = await response.json();
        return data.items.map((track: { uri: string }) => track.uri);
      } catch (e) {
        setError(`Failed to fetch album tracks: ${e}`);
        return [];
      }
    },
    [accessToken, isAuthorized]
  );

  const getPlaylistMetadata = useCallback(
    async (playlistId: string): Promise<{ name: string; artworkUrl?: string; owner: string; url: string } | null> => {
      if (!accessToken || !isAuthorized) return null;

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,images,owner.display_name,external_urls`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch playlist metadata');
        }

        const data = await response.json();
        return {
          name: data.name,
          artworkUrl: data.images?.[0]?.url,
          owner: data.owner?.display_name || 'Unknown',
          url: data.external_urls?.spotify || '',
        };
      } catch (e) {
        setError(`Failed to fetch playlist metadata: ${e}`);
        return null;
      }
    },
    [accessToken, isAuthorized]
  );

  const getPlaylistTracks = useCallback(
    async (playlistId: string): Promise<string[]> => {
      if (!accessToken || !isAuthorized) return [];

      try {
        const tracks: string[] = [];
        let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

        // Fetch all tracks (handle pagination)
        while (url) {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch playlist tracks');
          }

          const data = await response.json();
          const uris = data.items
            .filter((item: { track: { uri: string } | null }) => item.track !== null)
            .map((item: { track: { uri: string } }) => item.track.uri);
          tracks.push(...uris);
          url = data.next;
        }

        return tracks;
      } catch (e) {
        setError(`Failed to fetch playlist tracks: ${e}`);
        return [];
      }
    },
    [accessToken, isAuthorized]
  );

  return {
    isConfigured,
    isAuthorized,
    isLoading,
    error,
    authorize,
    handleCallback,
    unauthorize,
    getPlaylists,
    search,
    addToPlaylist,
    getAlbumTracks,
    getPlaylistMetadata,
    getPlaylistTracks,
  };
}
