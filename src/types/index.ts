export type RecommendationType = 'song' | 'album' | 'artist' | 'playlist' | 'note';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  spotifyId?: string;
  name?: string;
  artistName?: string;
  artworkUrl?: string;
  spotifyUrl?: string;
  externalUrl?: string;
  externalSource?: 'spotify' | 'apple' | 'youtube' | 'bandcamp' | 'unknown';
  noteText?: string;
  createdAt: string;
  listeningGuide?: string;
}

export interface AppState {
  isAuthorized: boolean;
  keeperPlaylistId: string | null;
  keeperPlaylistName: string | null;
  artistKeepCount: number;
  recommendations: Recommendation[];
}

export interface Playlist {
  id: string;
  name: string;
  artworkUrl?: string;
}

export interface SearchResult {
  id: string;
  type: 'song' | 'album' | 'artist' | 'playlist';
  name: string;
  artistName: string;
  artworkUrl?: string;
  spotifyUrl: string;
}

export type AddMode = 'url' | 'search' | 'note' | 'import';

export interface ExtractedMention {
  name: string;
  artistName: string;
  type: 'song' | 'album' | 'artist';
  spotifyMatch?: SearchResult;
  selected: boolean;
}

export interface UrlParseResult {
  source: 'spotify' | 'apple' | 'youtube' | 'bandcamp' | 'unknown';
  type?: 'song' | 'album' | 'artist' | 'playlist';
  id?: string;
  url?: string;
}
