import { XMarkIcon } from '@heroicons/react/24/outline';
import type { SearchResult } from '../types/index';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
  results: SearchResult[];
  title?: string;
}

export function SearchModal({
  isOpen,
  onClose,
  onSelect,
  results,
  title = 'Select a track to add',
}: SearchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {results.length === 0 ? (
            <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
              No results found
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => onSelect(result)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                  {result.artworkUrl ? (
                    <img
                      src={result.artworkUrl}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {result.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {result.artistName || result.type}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
