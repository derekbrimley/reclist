import { useState } from 'react';
import { XMarkIcon, LinkIcon, MagnifyingGlassIcon, PencilIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { AddMode, SearchResult, ExtractedMention } from '../types/index';
import { isValidUrl } from '../utils/urlParser';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUrl: (url: string) => void;
  onAddSearch: (result: SearchResult) => void;
  onAddNote: (text: string) => void;
  onSearch: (term: string) => Promise<SearchResult[]>;
  onExtractUrl?: (url: string) => Promise<ExtractedMention[]>;
  onAddBatch?: (mentions: ExtractedMention[]) => void;
}

export function AddModal({
  isOpen,
  onClose,
  onAddUrl,
  onAddSearch,
  onAddNote,
  onSearch,
  onExtractUrl,
  onAddBatch,
}: AddModalProps) {
  const [mode, setMode] = useState<AddMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Import tab state
  const [importUrl, setImportUrl] = useState('');
  const [extractedMentions, setExtractedMentions] = useState<ExtractedMention[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractDone, setExtractDone] = useState(false);

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

  const handleExtract = async () => {
    if (!importUrl.trim() || !isValidUrl(importUrl.trim()) || !onExtractUrl) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractedMentions([]);
    setExtractDone(false);

    try {
      const mentions = await onExtractUrl(importUrl.trim());
      if (mentions.length === 0) {
        setExtractError('No music recommendations found on this page. Try a different URL.');
      } else {
        setExtractedMentions(mentions);
        setExtractDone(true);
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to extract music from page.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleMention = (index: number) => {
    setExtractedMentions((prev) =>
      prev.map((m, i) => (i === index ? { ...m, selected: !m.selected } : m))
    );
  };

  const toggleAll = () => {
    const allSelected = extractedMentions.every((m) => m.selected);
    setExtractedMentions((prev) => prev.map((m) => ({ ...m, selected: !allSelected })));
  };

  const selectedCount = extractedMentions.filter((m) => m.selected).length;

  const handleAddSelected = () => {
    if (!onAddBatch) return;
    onAddBatch(extractedMentions);
    setImportUrl('');
    setExtractedMentions([]);
    setExtractDone(false);
    onClose();
  };

  const tabs = [
    { id: 'url' as const, label: 'URL', icon: LinkIcon },
    { id: 'search' as const, label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'note' as const, label: 'Note', icon: PencilIcon },
    { id: 'import' as const, label: 'Import', icon: GlobeAltIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
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
        <div className="p-4 overflow-y-auto">
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

          {mode === 'import' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Paste a link to a music blog, review, or recommendation list and we'll extract the music for you.
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                  placeholder="https://pitchfork.com/reviews/..."
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={isExtracting}
                />
                <button
                  onClick={handleExtract}
                  disabled={!importUrl.trim() || !isValidUrl(importUrl.trim()) || isExtracting}
                  className="px-4 py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {isExtracting ? '...' : 'Scan'}
                </button>
              </div>

              {/* Loading state */}
              {isExtracting && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Scanning page for music...
                    </p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {extractError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {extractError}
                </div>
              )}

              {/* Results */}
              {extractDone && extractedMentions.length > 0 && (
                <div className="space-y-3">
                  {/* Select all toggle */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Found {extractedMentions.length} item{extractedMentions.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={toggleAll}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {extractedMentions.every((m) => m.selected) ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {/* Checklist */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {extractedMentions.map((mention, index) => (
                      <button
                        key={`${mention.name}-${mention.artistName}-${index}`}
                        onClick={() => toggleMention(index)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          mention.selected
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                            : 'bg-zinc-50 dark:bg-zinc-800 opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                            mention.selected
                              ? 'bg-blue-600 text-white'
                              : 'border-2 border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {mention.selected && <CheckIcon className="w-3.5 h-3.5" />}
                        </div>

                        {/* Artwork */}
                        {mention.spotifyMatch?.artworkUrl ? (
                          <img
                            src={mention.spotifyMatch.artworkUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white truncate text-sm">
                            {mention.spotifyMatch?.name || mention.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {mention.spotifyMatch?.artistName || mention.artistName}
                            {!mention.spotifyMatch && (
                              <span className="text-zinc-400 dark:text-zinc-500"> — no Spotify match</span>
                            )}
                          </p>
                        </div>

                        {/* Type badge */}
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase flex-shrink-0">
                          {mention.type}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedCount === 0}
                    className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                  >
                    Add {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
