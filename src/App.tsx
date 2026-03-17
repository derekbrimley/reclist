import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useSpotify } from './hooks/useSpotify';
import { useSync } from './hooks/useSync';
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
  RandomPicksModal,
} from './components';
import type { SearchResult, Playlist, Recommendation } from './types/index';
import { parseUrl } from './utils/urlParser';
import { fetchYouTubeMetadata } from './utils/youtube';
import { generateListeningGuide } from './utils/claude';

function AppContent() {
  const { state, dispatch } = useApp();
  const {
    user,
    spotifyAccessToken,
    isLoading: authLoading,
    error: authError,
    signInWithSpotify,
    signOut,
  } = useSupabaseAuth();

  const {
    error: spotifyError,
    getPlaylists,
    search,
    addToPlaylist,
    getAlbumTracks,
    getPlaylistMetadata,
    getPlaylistTracks,
  } = useSpotify(spotifyAccessToken);

  const { syncAdd, syncRemove, syncUpdate, syncSettings, syncClearAll } = useSync({
    userId: user?.id ?? null,
    dispatch,
  });

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
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomPickIds, setRandomPickIds] = useState<string[]>([]);

  // Set auth and user state in AppContext
  useEffect(() => {
    const isAuthorized = !!user && !!spotifyAccessToken;
    dispatch({ type: 'SET_AUTHORIZED', payload: isAuthorized });
    dispatch({ type: 'SET_USER_ID', payload: user?.id ?? null });
  }, [user, spotifyAccessToken, dispatch]);

  // Show playlist selector after first sign-in if no playlist selected
  useEffect(() => {
    if (state.isAuthorized && state.isHydrated && !state.keeperPlaylistId) {
      setShowPlaylistSelector(true);
    }
  }, [state.isAuthorized, state.isHydrated, state.keeperPlaylistId]);

  const error = authError || spotifyError;

  // Helper to dispatch add and sync — generates the id upfront so we can sync immediately
  const addAndSync = useCallback(
    (payload: Omit<Recommendation, 'id' | 'createdAt'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const createdAt = new Date().toISOString();
      const rec: Recommendation = { ...payload, id, createdAt };
      dispatch({ type: 'SYNC_ADD', payload: rec });
      syncAdd(rec);
    },
    [dispatch, syncAdd]
  );

  const removeAndSync = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_RECOMMENDATION', payload: id });
      syncRemove(id);
    },
    [dispatch, syncRemove]
  );

  const updateAndSync = useCallback(
    (id: string, updates: Partial<Recommendation>) => {
      dispatch({ type: 'UPDATE_RECOMMENDATION', payload: { id, updates } });
      // Build full rec for sync
      const existing = state.recommendations.find((r) => r.id === id);
      if (existing) {
        syncUpdate({ ...existing, ...updates });
      }
    },
    [dispatch, syncUpdate, state.recommendations]
  );

  // Show login if not authorized
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!state.isAuthorized) {
    return (
      <LoginScreen
        onLogin={signInWithSpotify}
        isLoading={authLoading}
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
            syncSettings({ keeperPlaylistId: playlist.id, keeperPlaylistName: playlist.name });
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
          addAndSync({
            type: 'playlist',
            spotifyId: parsed.id,
            spotifyUrl: metadata.url,
            name: metadata.name,
            artistName: metadata.owner,
            artworkUrl: metadata.artworkUrl,
          });
        } else {
          addAndSync({
            type: 'playlist',
            spotifyId: parsed.id,
            spotifyUrl: url,
            name: 'Spotify Playlist',
            artistName: '',
          });
        }
      } else {
        addAndSync({
          type: parsed.type || 'song',
          spotifyId: parsed.id,
          spotifyUrl: url,
          name: 'Loading...',
          artistName: '',
        });
      }
    } else if (parsed.source === 'youtube') {
      const metadata = await fetchYouTubeMetadata(url);
      addAndSync({
        type: 'note',
        noteText: metadata?.title || 'YouTube video',
        name: metadata?.title,
        artistName: metadata?.authorName,
        artworkUrl: metadata?.thumbnailUrl,
        externalUrl: url,
        externalSource: parsed.source,
      });
    } else {
      addAndSync({
        type: 'note',
        noteText: `From ${parsed.source}: ${url}`,
        externalUrl: url,
        externalSource: parsed.source,
      });
    }
  };

  const handleAddSearch = (result: SearchResult) => {
    addAndSync({
      type: result.type,
      spotifyId: result.id,
      name: result.name,
      artistName: result.artistName,
      artworkUrl: result.artworkUrl,
      spotifyUrl: result.spotifyUrl,
    });
  };

  const handleAddNote = (text: string) => {
    addAndSync({
      type: 'note',
      noteText: text,
    });
  };

  const handlePlay = (rec: (typeof state.recommendations)[0]) => {
    if (rec.externalUrl && rec.externalSource !== 'spotify') {
      window.open(rec.externalUrl, '_blank');
      return;
    }

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

    if (rec.name) {
      const searchQuery = rec.artistName
        ? `${rec.name} ${rec.artistName}`
        : rec.name;
      const encodedQuery = encodeURIComponent(searchQuery);
      const spotifyUrl = `https://open.spotify.com/search/${encodedQuery}`;
      window.open(spotifyUrl, '_blank');
    } else if (rec.noteText) {
      const encodedQuery = encodeURIComponent(rec.noteText);
      const spotifyUrl = `https://open.spotify.com/search/${encodedQuery}`;
      window.open(spotifyUrl, '_blank');
    }
  };

  const handleKeep = async (rec: (typeof state.recommendations)[0]) => {
    if (!state.keeperPlaylistId) return;

    if (rec.spotifyId) {
      let success = false;

      if (rec.type === 'song') {
        success = await addToPlaylist(state.keeperPlaylistId, `spotify:track:${rec.spotifyId}`);
      } else if (rec.type === 'album') {
        const trackUris = await getAlbumTracks(rec.spotifyId);
        if (trackUris.length > 0) {
          success = await addToPlaylist(state.keeperPlaylistId, trackUris);
        }
      } else if (rec.type === 'playlist') {
        const trackUris = await getPlaylistTracks(rec.spotifyId);
        if (trackUris.length > 0) {
          success = await addToPlaylist(state.keeperPlaylistId, trackUris);
        }
      }

      if (!success && (rec.type === 'song' || rec.type === 'album' || rec.type === 'playlist')) {
        return;
      }

      removeAndSync(rec.id);
    } else {
      const searchQuery = rec.name
        ? `${rec.name} ${rec.artistName || ''}`
        : rec.noteText || '';

      if (searchQuery.trim()) {
        const results = await search(searchQuery.trim());
        const songResults = results.filter((r) => r.type === 'song');
        setSearchResults(songResults);
        setPendingRecId(rec.id);
        setShowSearchModal(true);
      }
    }
  };

  const handleSearchSelect = async (result: SearchResult) => {
    if (isResolveMode) {
      if (pendingRecId) {
        removeAndSync(pendingRecId);
      }
      addAndSync({
        type: result.type,
        spotifyId: result.id,
        name: result.name,
        artistName: result.artistName,
        artworkUrl: result.artworkUrl,
        spotifyUrl: result.spotifyUrl,
      });
    } else {
      if (state.keeperPlaylistId && result.id) {
        await addToPlaylist(state.keeperPlaylistId, `spotify:track:${result.id}`);
      }
      if (pendingRecId) {
        removeAndSync(pendingRecId);
      }
    }
    setShowSearchModal(false);
    setSearchResults([]);
    setPendingRecId(null);
    setIsResolveMode(false);
  };

  const handleDismiss = (id: string) => {
    removeAndSync(id);
  };

  const handleRandom = () => {
    const shuffled = [...state.recommendations].sort(() => Math.random() - 0.5);
    setRandomPickIds(shuffled.slice(0, 3).map((r) => r.id));
    setShowRandomModal(true);
  };

  const randomPicks = state.recommendations.filter((r) => randomPickIds.includes(r.id));

  const handleResolve = async (rec: (typeof state.recommendations)[0]) => {
    if (rec.externalUrl) {
      window.open(rec.externalUrl, '_blank');
    } else {
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
    const displayName = rec.artistName
      ? `${rec.name} by ${rec.artistName}`
      : rec.name || rec.noteText || 'this music';
    setGuideRecName(displayName);
    setShowGuideModal(true);

    if (rec.listeningGuide) {
      setGuideContent(rec.listeningGuide);
      setGuideLoading(false);
      setGuideError(null);
      return;
    }

    setGuideContent(null);
    setGuideLoading(true);
    setGuideError(null);

    try {
      const guide = await generateListeningGuide(rec);
      setGuideContent(guide);
      updateAndSync(rec.id, { listeningGuide: guide });
    } catch (err) {
      setGuideError(err instanceof Error ? err.message : 'Failed to generate listening guide');
    } finally {
      setGuideLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header
        onAddClick={() => setShowAddModal(true)}
        onSettingsClick={() => setShowSettings(true)}
        onRandomClick={handleRandom}
        hasRecommendations={state.recommendations.length > 0}
      />

      <main className="max-w-5xl mx-auto px-4 py-4">
        {state.recommendations.length === 0 ? (
          <EmptyState onAddClick={() => setShowAddModal(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          await signOut();
          dispatch({ type: 'SET_AUTHORIZED', payload: false });
        }}
        onClearAll={() => {
          dispatch({ type: 'CLEAR_ALL' });
          syncClearAll();
        }}
      />

      <PlaylistSelector
        isOpen={showPlaylistSelector}
        onClose={() => setShowPlaylistSelector(false)}
        onSelect={(playlist: Playlist) => {
          dispatch({
            type: 'SET_KEEPER_PLAYLIST',
            payload: { id: playlist.id, name: playlist.name },
          });
          syncSettings({ keeperPlaylistId: playlist.id, keeperPlaylistName: playlist.name });
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

      <RandomPicksModal
        isOpen={showRandomModal}
        onClose={() => setShowRandomModal(false)}
        picks={randomPicks}
        onReshuffle={handleRandom}
        onPlay={handlePlay}
        onKeep={handleKeep}
        onDismiss={handleDismiss}
        onResolve={handleResolve}
        onGuide={handleGuide}
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
