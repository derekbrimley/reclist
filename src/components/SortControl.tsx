export type SortOption = 'recent' | 'opened' | 'alpha';

interface SortControlProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'opened', label: 'Recently Opened' },
  { value: 'alpha', label: 'A-Z' },
];

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-0.5 mb-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors ${
            value === option.value
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
