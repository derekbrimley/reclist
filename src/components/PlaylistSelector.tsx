import { useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import type { Playlist } from '../types/index';

interface PlaylistSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playlist: Playlist) => void;
  currentPlaylistId: string | null;
  getPlaylists: () => Promise<Playlist[]>;
}

export function PlaylistSelector({
  isOpen,
  onClose,
  onSelect,
  currentPlaylistId,
  getPlaylists,
}: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getPlaylists().then((p) => {
        setPlaylists(p);
        setIsLoading(false);
      });
    }
  }, [isOpen, getPlaylists]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Select Keeper Playlist
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Kept recommendations will be added to this playlist
          </p>
        </div>

        {/* Playlists */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              Loading playlists...
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No playlists found. Create one in Spotify first.
            </div>
          ) : (
            <div className="p-2">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    onSelect(playlist);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    currentPlaylistId === playlist.id
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {playlist.artworkUrl ? (
                    <img
                      src={playlist.artworkUrl}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <span className="text-xl">🎵</span>
                    </div>
                  )}
                  <span className="flex-1 text-left font-medium text-zinc-900 dark:text-white">
                    {playlist.name}
                  </span>
                  {currentPlaylistId === playlist.id && (
                    <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cancel button */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
