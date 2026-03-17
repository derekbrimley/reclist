import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation } from '../types';

interface RandomPicksModalProps {
  isOpen: boolean;
  onClose: () => void;
  picks: Recommendation[];
  onReshuffle: () => void;
  onPlay: (rec: Recommendation) => void;
  onKeep: (rec: Recommendation) => void;
  onDismiss: (id: string) => void;
  onResolve: (rec: Recommendation) => void;
  onGuide: (rec: Recommendation) => void;
}

export function RandomPicksModal({
  isOpen,
  onClose,
  picks,
  onReshuffle,
  onPlay,
  onKeep,
  onDismiss,
  onResolve,
  onGuide,
}: RandomPicksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Random Picks</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {picks.length} from your list
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReshuffle}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Reshuffle"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full px-4 py-4">
          {picks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">All picks have been triaged!</p>
              <button
                onClick={onReshuffle}
                className="px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Pick more
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {picks.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onPlay={() => onPlay(rec)}
                  onKeep={() => onKeep(rec)}
                  onDismiss={() => onDismiss(rec.id)}
                  onResolve={() => onResolve(rec)}
                  onGuide={() => onGuide(rec)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
