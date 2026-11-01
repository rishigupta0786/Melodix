"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { useSongDownload } from "@/hooks/useSongDownload";
import { toStoredLocalTrack } from "@/services/localTrack";

const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Favorite and download buttons for the currently playing online (JioSaavn) track.
const buttonClass =
  "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function FavoriteButton({ track, disabled }) {
  const { isFavorite, toggle } = useFavorites();

  if (!track?.streamUrl && !track?.youtubeVideoId && track?.provider !== "local") return null;

  const favorite = isFavorite(track.id);

  return (
    <button
      type="button"
      onClick={() => toggle(track.provider === "local" ? toStoredLocalTrack(track) : { provider: "saavn", ...track })}
      disabled={disabled}
      aria-label={
        favorite
          ? `Remove ${track.title} from favorites`
          : `Add ${track.title} to favorites`
      }
      aria-pressed={favorite}
      className={`${buttonClass} ${
        favorite
          ? "text-accent"
          : "text-text-secondary hover:bg-white/10 hover:text-accent"
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
  );
}

export function DownloadButton({ track, disabled }) {
  const { download, isDownloading, percent, error } = useSongDownload(track);

  // Local files are already on the device
  if (track?.provider === "local" || (!track?.streamUrl && !track?.youtubeVideoId)) return null;

  return (
    <button
      type="button"
      onClick={download}
      disabled={disabled || isDownloading}
      aria-label={`Download ${track.title}`}
      title={
        error ||
        (isDownloading
          ? `Downloading... ${Math.round(percent)}%`
          : "Download song")
      }
      className={`${buttonClass} ${
        error
          ? "text-red-400"
          : "text-text-secondary hover:bg-white/10 hover:text-accent"
      } ${isDownloading ? "disabled:cursor-wait disabled:opacity-100" : ""}`}
    >
      {isDownloading ? (
        <svg
          viewBox="0 0 36 36"
          className="h-8 w-8 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.2"
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - Math.max(percent, 4) / 100)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
