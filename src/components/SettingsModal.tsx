import { XMarkIcon } from '@heroicons/react/24/outline';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  keeperPlaylistName: string | null;
  onChangePlaylist: () => void;
  onSignOut: () => void;
  onClearAll: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  keeperPlaylistName,
  onChangePlaylist,
  onSignOut,
  onClearAll,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Keeper playlist */}
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Keeper Playlist</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {keeperPlaylistName || 'Not selected'}
                </p>
              </div>
              <button
                onClick={onChangePlaylist}
                className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Change
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <button
              onClick={() => {
                if (confirm('Clear all recommendations? This cannot be undone.')) {
                  onClearAll();
                  onClose();
                }
              }}
              className="w-full py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Clear All Recommendations
            </button>
            <button
              onClick={() => {
                if (confirm('Sign out of Spotify?')) {
                  onSignOut();
                  onClose();
                }
              }}
              className="w-full py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
