import type { UrlParseResult } from '../types/index';

export function parseUrl(url: string): UrlParseResult {
  const trimmedUrl = url.trim();

  // Apple Music
  // Format: https://music.apple.com/us/album/album-name/1234567890
  // Format: https://music.apple.com/us/album/album-name/1234567890?i=1234567891 (song)
  if (trimmedUrl.includes('music.apple.com')) {
    // Check for song (has ?i= parameter)
    const songMatch = trimmedUrl.match(/\/album\/[^/]+\/(\d+)\?i=(\d+)/);
    if (songMatch) {
      return { source: 'apple', type: 'song', id: songMatch[2] };
    }

    // Album
    const albumMatch = trimmedUrl.match(/\/album\/[^/]+\/(\d+)/);
    if (albumMatch) {
      return { source: 'apple', type: 'album', id: albumMatch[1] };
    }

    // Artist
    const artistMatch = trimmedUrl.match(/\/artist\/[^/]+\/(\d+)/);
    if (artistMatch) {
      return { source: 'apple', type: 'artist', id: artistMatch[1] };
    }

    return { source: 'apple', url: trimmedUrl };
  }

  // Spotify
  // Format: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  if (trimmedUrl.includes('spotify.com') || trimmedUrl.includes('spotify.link')) {
    const trackMatch = trimmedUrl.match(/\/track\/(\w+)/);
    if (trackMatch) {
      return { source: 'spotify', type: 'song', id: trackMatch[1] };
    }

    const albumMatch = trimmedUrl.match(/\/album\/(\w+)/);
    if (albumMatch) {
      return { source: 'spotify', type: 'album', id: albumMatch[1] };
    }

    const artistMatch = trimmedUrl.match(/\/artist\/(\w+)/);
    if (artistMatch) {
      return { source: 'spotify', type: 'artist', id: artistMatch[1] };
    }

    const playlistMatch = trimmedUrl.match(/\/playlist\/(\w+)/);
    if (playlistMatch) {
      return { source: 'spotify', type: 'playlist', id: playlistMatch[1] };
    }

    return { source: 'spotify', url: trimmedUrl };
  }

  // YouTube
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    return { source: 'youtube', url: trimmedUrl };
  }

  // Bandcamp
  if (trimmedUrl.includes('bandcamp.com')) {
    return { source: 'bandcamp', url: trimmedUrl };
  }

  return { source: 'unknown', url: trimmedUrl };
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
