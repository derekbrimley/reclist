import { MusicalNoteIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <MusicalNoteIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
        No recommendations yet
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">
        Add music recommendations from URLs, search, or quick notes to build your listening queue.
      </p>
      <button
        onClick={onAddClick}
        className="px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Add your first recommendation
      </button>
    </div>
  );
}
