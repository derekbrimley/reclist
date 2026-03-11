import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useSpotify } from './hooks/useSpotify';
import {
  Header,
  RecommendationCard,
  AddModal,
  EmptyState,
  LoginScreen,
  PlaylistSelector,
  SettingsModal,
  SearchModal,
  ListeningGuideModal,
} from './components';
import type { SearchResult, Playlist } from './types/index';
import { parseUrl } from './utils/urlParser';
import { fetchYouTubeMetadata } from './utils/youtube';
import { generateListeningGuide } from './utils/claude';

function AppContent() {
  const { state, dispatch } = useApp();
  const {
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
  } = useSpotify();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pendingRecId, setPendingRecId] = useState<string | null>(null);
  const [isResolveMode, setIsResolveMode] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideContent, setGuideContent] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [guideRecName, setGuideRecName] = useState<string | undefined>(undefined);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleCallback(code).then((success) => {
        if (success) {
          dispatch({ type: 'SET_AUTHORIZED', payload: true });
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Show playlist selector after login
          setShowPlaylistSelector(true);
        }
      });
    }
  }, [handleCallback, dispatch]);

  // Show login if not authorized
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <LoginScreen
        onLogin={async () => {
          const success = await authorize();
          if (success) {
            dispatch({ type: 'SET_AUTHORIZED', payload: true });
            // Show playlist selector after login
            setShowPlaylistSelector(true);
          }
        }}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Show playlist selector if no playlist selected
  if (!state.keeperPlaylistId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <PlaylistSelector
          isOpen={true}
          onClose={() => {}}
          onSelect={(playlist: Playlist) => {
            dispatch({
              type: 'SET_KEEPER_PLAYLIST',
              payload: { id: playlist.id, name: playlist.name },
            });
          }}
          currentPlaylistId={null}
          getPlaylists={getPlaylists}
        />
      </div>
    );
  }

  const handleAddUrl = async (url: string) => {
    const parsed = parseUrl(url);

    if (parsed.source === 'spotify' && parsed.id) {
      // For Spotify playlists, fetch metadata
      if (parsed.type === 'playlist') {
        const metadata = await getPlaylistMetadata(parsed.id);
        if (metadata) {
          dispatch({
            type: 'ADD_RECOMMENDATION',
            payload: {
              type: 'playlist',
              spotifyId: parsed.id,
              spotifyUrl: metadata.url,
              name: metadata.name,
              artistName: metadata.owner,
              artworkUrl: metadata.artworkUrl,
            },
          });
        } else {
          // Fallback if metadata fetch fails
          dispatch({
            type: 'ADD_RECOMMENDATION',
            payload: {
              type: 'playlist',
              spotifyId: parsed.id,
              spotifyUrl: url,
              name: 'Spotify Playlist',
              artistName: '',
            },
          });
        }
      } else {
        // For other Spotify URLs, we have the ID directly
        dispatch({
          type: 'ADD_RECOMMENDATION',
          payload: {
            type: parsed.type || 'song',
            spotifyId: parsed.id,
            spotifyUrl: url,
            name: 'Loading...',
            artistName: '',
          },
        });
      }
    } else if (parsed.source === 'youtube') {
      // For YouTube, fetch metadata
      const metadata = await fetchYouTubeMetadata(url);
      dispatch({
        type: 'ADD_RECOMMENDATION',
        payload: {
          type: 'note',
          noteText: metadata?.title || 'YouTube video',
          name: metadata?.title,
          artistName: metadata?.authorName,
          artworkUrl: metadata?.thumbnailUrl,
          externalUrl: url,
          externalSource: parsed.source,
        },
      });
    } else {
      // For other sources (Apple Music, Bandcamp, etc.), add as external
      dispatch({
        type: 'ADD_RECOMMENDATION',
        payload: {
          type: 'note',
          noteText: `From ${parsed.source}: ${url}`,
          externalUrl: url,
          externalSource: parsed.source,
        },
      });
    }
  };

  const handleAddSearch = (result: SearchResult) => {
    dispatch({
      type: 'ADD_RECOMMENDATION',
      payload: {
        type: result.type,
        spotifyId: result.id,
        name: result.name,
        artistName: result.artistName,
        artworkUrl: result.artworkUrl,
        spotifyUrl: result.spotifyUrl,
      },
    });
  };

  const handleAddNote = (text: string) => {
    dispatch({
      type: 'ADD_RECOMMENDATION',
      payload: {
        type: 'note',
        noteText: text,
      },
    });
  };

  const handlePlay = (rec: (typeof state.recommendations)[0]) => {
    // If it's an external URL (YouTube, Bandcamp, etc.), open it directly
    if (rec.externalUrl && rec.externalSource !== 'spotify') {
      window.open(rec.externalUrl, '_blank');
      return;
    }

    // If it's a Spotify recommendation with an ID, use Spotify URI to open in desktop app
    if (rec.spotifyId) {
      let spotifyUri = '';
      if (rec.type === 'song') {
        spotifyUri = `spotify:track:${rec.spotifyId}`;
      } else if (rec.type === 'album') {
        spotifyUri = `spotify:album:${rec.spotifyId}`;
      } else if (rec.type === 'artist') {
        spotifyUri = `spotify:artist:${rec.spotifyId}`;
      } else if (rec.type === 'playlist') {
        spotifyUri = `spotify:playlist:${rec.spotifyId}`;
      }

      if (spotifyUri) {
        window.location.href = spotifyUri;
        return;
      }
    }

    // For recommendations without a Spotify ID, search Spotify
    if (rec.name) {
      const searchQuery = rec.artistName
        ? `${rec.name} ${rec.artistName}`
        : rec.name;
      const encodedQuery = encodeURIComponent(searchQuery);
      const spotifyUrl = `https://open.spotify.com/search/${encodedQuery}`;
      window.open(spotifyUrl, '_blank');
    } else if (rec.noteText) {
      // For plain text notes, search the note text on Spotify
      const encodedQuery = encodeURIComponent(rec.noteText);
      const spotifyUrl = `https://open.spotify.com/search/${encodedQuery}`;
      window.open(spotifyUrl, '_blank');
    }
  };

  const handleKeep = async (rec: (typeof state.recommendations)[0]) => {
    if (!state.keeperPlaylistId) return;

    // If it's a Spotify recommendation with an ID, add it directly
    if (rec.spotifyId) {
      let success = false;

      if (rec.type === 'song') {
        success = await addToPlaylist(state.keeperPlaylistId, `spotify:track:${rec.spotifyId}`);
      } else if (rec.type === 'album') {
        // Fetch all tracks from the album and add them
        const trackUris = await getAlbumTracks(rec.spotifyId);
        if (trackUris.length > 0) {
          success = await addToPlaylist(state.keeperPlaylistId, trackUris);
        }
      } else if (rec.type === 'playlist') {
        // Fetch all tracks from the playlist and add them
        const trackUris = await getPlaylistTracks(rec.spotifyId);
        if (trackUris.length > 0) {
          success = await addToPlaylist(state.keeperPlaylistId, trackUris);
        }
      }
      // For artists, we can't directly add - just remove from inbox for now

      if (!success && (rec.type === 'song' || rec.type === 'album' || rec.type === 'playlist')) {
        // Failed to add to playlist, don't remove from inbox
        return;
      }

      dispatch({ type: 'REMOVE_RECOMMENDATION', payload: rec.id });
    } else {
      // For non-Spotify recommendations (YouTube, Apple Music, etc.), search Spotify
      const searchQuery = rec.name
        ? `${rec.name} ${rec.artistName || ''}`
        : rec.noteText || '';

      if (searchQuery.trim()) {
        const results = await search(searchQuery.trim());
        // Filter to only show songs (not albums or artists)
        const songResults = results.filter((r) => r.type === 'song');
        setSearchResults(songResults);
        setPendingRecId(rec.id);
        setShowSearchModal(true);
      }
    }
  };

  const handleSearchSelect = async (result: SearchResult) => {
    if (isResolveMode) {
      // In resolve mode: replace the note with the selected track
      if (pendingRecId) {
        dispatch({ type: 'REMOVE_RECOMMENDATION', payload: pendingRecId });
      }
      dispatch({
        type: 'ADD_RECOMMENDATION',
        payload: {
          type: result.type,
          spotifyId: result.id,
          name: result.name,
          artistName: result.artistName,
          artworkUrl: result.artworkUrl,
          spotifyUrl: result.spotifyUrl,
        },
      });
    } else {
      // In keep mode: add to playlist and remove from inbox
      if (state.keeperPlaylistId && result.id) {
        await addToPlaylist(state.keeperPlaylistId, `spotify:track:${result.id}`);
      }
      if (pendingRecId) {
        dispatch({ type: 'REMOVE_RECOMMENDATION', payload: pendingRecId });
      }
    }
    setShowSearchModal(false);
    setSearchResults([]);
    setPendingRecId(null);
    setIsResolveMode(false);
  };

  const handleDismiss = (id: string) => {
    dispatch({ type: 'REMOVE_RECOMMENDATION', payload: id });
  };

  const handleResolve = async (rec: (typeof state.recommendations)[0]) => {
    // If this note has an external URL, open it directly
    if (rec.externalUrl) {
      window.open(rec.externalUrl, '_blank');
    } else {
      // For plain text notes, search Spotify to resolve them
      const searchQuery = rec.noteText || '';
      if (searchQuery.trim()) {
        const results = await search(searchQuery.trim());
        setSearchResults(results);
        setPendingRecId(rec.id);
        setIsResolveMode(true);
        setShowSearchModal(true);
      }
    }
  };

  const handleGuide = async (rec: (typeof state.recommendations)[0]) => {
    // Build a display name for the recommendation
    const displayName = rec.artistName
      ? `${rec.name} by ${rec.artistName}`
      : rec.name || rec.noteText || 'this music';
    setGuideRecName(displayName);
    setShowGuideModal(true);

    // If we already have a listening guide for this recommendation, show it
    if (rec.listeningGuide) {
      setGuideContent(rec.listeningGuide);
      setGuideLoading(false);
      setGuideError(null);
      return;
    }

    // Otherwise, generate a new one
    setGuideContent(null);
    setGuideLoading(true);
    setGuideError(null);

    try {
      const guide = await generateListeningGuide(rec);
      setGuideContent(guide);
      // Save the guide to the recommendation for future viewing
      dispatch({
        type: 'UPDATE_RECOMMENDATION',
        payload: { id: rec.id, updates: { listeningGuide: guide } },
      });
    } catch (err) {
      setGuideError(err instanceof Error ? err.message : 'Failed to generate listening guide');
    } finally {
      setGuideLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header onAddClick={() => setShowAddModal(true)} onSettingsClick={() => setShowSettings(true)} />

      <main className="max-w-lg mx-auto px-4 py-4">
        {state.recommendations.length === 0 ? (
          <EmptyState onAddClick={() => setShowAddModal(true)} />
        ) : (
          <div className="space-y-3">
            {state.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onPlay={() => handlePlay(rec)}
                onKeep={() => handleKeep(rec)}
                onDismiss={() => handleDismiss(rec.id)}
                onResolve={() => handleResolve(rec)}
                onGuide={() => handleGuide(rec)}
              />
            ))}
          </div>
        )}
      </main>

      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddUrl={handleAddUrl}
        onAddSearch={handleAddSearch}
        onAddNote={handleAddNote}
        onSearch={search}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        keeperPlaylistName={state.keeperPlaylistName}
        onChangePlaylist={() => {
          setShowSettings(false);
          setShowPlaylistSelector(true);
        }}
        onSignOut={async () => {
          await unauthorize();
          dispatch({ type: 'SET_AUTHORIZED', payload: false });
        }}
        onClearAll={() => dispatch({ type: 'CLEAR_ALL' })}
      />

      <PlaylistSelector
        isOpen={showPlaylistSelector}
        onClose={() => setShowPlaylistSelector(false)}
        onSelect={(playlist: Playlist) => {
          dispatch({
            type: 'SET_KEEPER_PLAYLIST',
            payload: { id: playlist.id, name: playlist.name },
          });
        }}
        currentPlaylistId={state.keeperPlaylistId}
        getPlaylists={getPlaylists}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchResults([]);
          setPendingRecId(null);
          setIsResolveMode(false);
        }}
        onSelect={handleSearchSelect}
        results={searchResults}
        title={isResolveMode ? "Find the track you wrote down" : "Select a track to add to playlist"}
      />

      <ListeningGuideModal
        isOpen={showGuideModal}
        onClose={() => {
          setShowGuideModal(false);
          setGuideContent(null);
          setGuideError(null);
          setGuideRecName(undefined);
        }}
        content={guideContent}
        isLoading={guideLoading}
        error={guideError}
        recommendationName={guideRecName}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
