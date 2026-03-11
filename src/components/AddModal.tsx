import { useState } from 'react';
import { XMarkIcon, LinkIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { AddMode, SearchResult } from '../types/index';
import { isValidUrl } from '../utils/urlParser';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUrl: (url: string) => void;
  onAddSearch: (result: SearchResult) => void;
  onAddNote: (text: string) => void;
  onSearch: (term: string) => Promise<SearchResult[]>;
}

export function AddModal({
  isOpen,
  onClose,
  onAddUrl,
  onAddSearch,
  onAddNote,
  onSearch,
}: AddModalProps) {
  const [mode, setMode] = useState<AddMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleUrlSubmit = () => {
    if (urlInput.trim() && isValidUrl(urlInput.trim())) {
      onAddUrl(urlInput.trim());
      setUrlInput('');
      onClose();
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setIsSearching(true);
    const results = await onSearch(searchInput.trim());
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectResult = (result: SearchResult) => {
    onAddSearch(result);
    setSearchInput('');
    setSearchResults([]);
    onClose();
  };

  const handleNoteSubmit = () => {
    if (noteInput.trim()) {
      onAddNote(noteInput.trim());
      setNoteInput('');
      onClose();
    }
  };

  const tabs = [
    { id: 'url' as const, label: 'URL', icon: LinkIcon },
    { id: 'search' as const, label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'note' as const, label: 'Note', icon: PencilIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Add Recommendation
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'url' && (
            <div className="space-y-4">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste Spotify, Apple Music, YouTube, or Bandcamp URL"
                className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || !isValidUrl(urlInput.trim())}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {mode === 'search' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search Spotify..."
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchInput.trim() || isSearching}
                  className="px-4 py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
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
            </div>
          )}

          {mode === 'note' && (
            <div className="space-y-4">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write a note to remind yourself..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
              <button
                onClick={handleNoteSubmit}
                disabled={!noteInput.trim()}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Add Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
