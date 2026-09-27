"use client";

import { useFavorites } from "@/hooks/useFavorites";

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function YouTubeResultCard({
  track,
  onPlay,
  className = "",
}) {
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(track.id);

  const handleFavoriteClick = (event) => {
    event.stopPropagation();
    toggle(track);
  };

  const handlePlayClick = (event) => {
    event.stopPropagation();
    onPlay?.(track);
  };

  return (
    <article
      className={`glass-panel flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/10 ${className}`}
      role="listitem"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {track.thumbnail ? (
          <img
            src={track.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-secondary">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </div>
        )}
        {track.duration && (
          <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/80 text-white px-1.5 py-0.5 rounded">
            {formatDuration(track.duration)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-medium text-text-primary">{track.title}</h3>
        <p className="truncate text-xs text-text-secondary mt-0.5">{track.artist}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={`Play ${track.title}`}
          className="focus-ring flex shrink-0 items-center justify-center h-9 w-9 rounded-full text-text-primary hover:bg-white/10 hover:text-accent transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <polygon points="7,4 20,12 7,20" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={favorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
          aria-pressed={favorite}
          className={`focus-ring flex shrink-0 items-center justify-center h-9 w-9 rounded-full transition-colors ${
            favorite ? "text-accent" : "text-text-secondary hover:text-accent hover:bg-white/10"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${favorite ? "fill-current" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}