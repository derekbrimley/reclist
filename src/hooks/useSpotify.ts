import { useState, useCallback } from 'react';
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

export function useSpotify(accessToken: string | null) {
  const [error, setError] = useState<string | null>(null);

  const getPlaylists = useCallback(async (): Promise<Playlist[]> => {
    if (!accessToken) return [];

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
  }, [accessToken]);

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
      if (!accessToken) return false;

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
    [accessToken]
  );

  const getAlbumTracks = useCallback(
    async (albumId: string): Promise<string[]> => {
      if (!accessToken) return [];

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
    [accessToken]
  );

  const getPlaylistMetadata = useCallback(
    async (playlistId: string): Promise<{ name: string; artworkUrl?: string; owner: string; url: string } | null> => {
      if (!accessToken) return null;

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
    [accessToken]
  );

  const getPlaylistTracks = useCallback(
    async (playlistId: string): Promise<string[]> => {
      if (!accessToken) return [];

      try {
        const tracks: string[] = [];
        let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

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
    [accessToken]
  );

  return {
    error,
    getPlaylists,
    search,
    addToPlaylist,
    getAlbumTracks,
    getPlaylistMetadata,
    getPlaylistTracks,
  };
}
