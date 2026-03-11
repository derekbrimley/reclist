import { PlusIcon, Cog6ToothIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
  onRandomClick: () => void;
  hasRecommendations: boolean;
}

export function Header({ onAddClick, onSettingsClick, onRandomClick, hasRecommendations }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Reclist</h1>
        <div className="flex items-center gap-2">
          {hasRecommendations && (
            <button
              onClick={onRandomClick}
              className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Random picks"
            >
              <SparklesIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onAddClick}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Add recommendation"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
