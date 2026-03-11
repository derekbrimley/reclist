import { XMarkIcon } from '@heroicons/react/24/solid';

interface ListeningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  recommendationName?: string;
}

export function ListeningGuideModal({
  isOpen,
  onClose,
  content,
  isLoading,
  error,
  recommendationName,
}: ListeningGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Listening Guide
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
          {recommendationName && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              {recommendationName}
            </p>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              <span className="text-zinc-600 dark:text-zinc-300">
                Generating listening guide...
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
              {error}
            </div>
          )}

          {content && !isLoading && (
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
