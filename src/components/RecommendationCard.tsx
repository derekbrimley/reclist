import { PlayIcon, HeartIcon, XMarkIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import type { Recommendation } from '../types/index';
import { timeAgo } from '../utils/time';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onPlay: () => void;
  onKeep: () => void;
  onDismiss: () => void;
  onResolve?: () => void;
  onGuide?: () => void;
}

export function RecommendationCard({
  recommendation,
  onPlay,
  onKeep,
  onDismiss,
  onResolve,
  onGuide,
}: RecommendationCardProps) {
  const isNote = recommendation.type === 'note';

  const getTypeLabel = () => {
    if (isNote && recommendation.externalUrl) {
      switch (recommendation.externalSource) {
        case 'youtube':
          return 'YouTube';
        case 'apple':
          return 'Apple Music';
        case 'bandcamp':
          return 'Bandcamp';
        default:
          return 'External';
      }
    }
    return {
      song: 'Song',
      album: 'Album',
      artist: 'Artist',
      playlist: 'Playlist',
      note: 'Note',
    }[recommendation.type];
  };

  const typeLabel = getTypeLabel();

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm">
      <div className="flex gap-3">
        {/* Artwork or placeholder */}
        <div className="flex-shrink-0">
          {recommendation.artworkUrl ? (
            <img
              src={recommendation.artworkUrl}
              alt=""
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
              <span className="text-2xl text-zinc-400 dark:text-zinc-500">
                {isNote ? '📝' : '🎵'}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isNote ? (
            <>
              {recommendation.externalUrl && recommendation.name ? (
                // External link with metadata (YouTube, etc.)
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-medium truncate">
                    {recommendation.name}
                  </h3>
                  {recommendation.artistName && (
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate">
                      {recommendation.artistName}
                    </p>
                  )}
                </div>
              ) : recommendation.externalUrl ? (
                // External link without metadata
                <div>
                  <p className="text-zinc-900 dark:text-white font-medium truncate">
                    {recommendation.externalSource === 'youtube' && 'YouTube Link'}
                    {recommendation.externalSource === 'apple' && 'Apple Music Link'}
                    {recommendation.externalSource === 'bandcamp' && 'Bandcamp Link'}
                    {recommendation.externalSource === 'unknown' && 'External Link'}
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate">
                    {recommendation.externalUrl}
                  </p>
                </div>
              ) : (
                // Plain text note
                <p className="text-zinc-900 dark:text-white font-medium line-clamp-2">
                  "{recommendation.noteText}"
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-zinc-900 dark:text-white font-medium truncate">
                {recommendation.name}
              </h3>
              {recommendation.artistName && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate">
                  {recommendation.artistName}
                </p>
              )}
            </>
          )}
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
            {typeLabel} • {timeAgo(recommendation.createdAt)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
        {isNote && !recommendation.externalUrl ? (
          // Plain text note: only Resolve and Dismiss
          <>
            <button
              onClick={onResolve}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              Resolve
            </button>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </>
        ) : isNote && recommendation.externalUrl ? (
          // External URL (YouTube, Apple Music, etc.): Open, Guide, Keep, and Dismiss
          <>
            <button
              onClick={onResolve}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Open
            </button>
            {recommendation.name && (
              <button
                onClick={onGuide}
                className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                aria-label="Listening guide"
                title="Get listening guide"
              >
                <LightBulbIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onKeep}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <HeartIcon className="w-4 h-4" />
              Keep
            </button>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </>
        ) : (
          // Spotify items: Play, Guide, Keep, and Dismiss
          <>
            <button
              onClick={onPlay}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              Play
            </button>
            <button
              onClick={onGuide}
              className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              aria-label="Listening guide"
              title="Get listening guide"
            >
              <LightBulbIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onKeep}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <HeartIcon className="w-4 h-4" />
              Keep
            </button>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
