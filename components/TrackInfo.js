"use client";

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <circle cx="8" cy="17" r="3" fill="currentColor" />
      <circle cx="17" cy="15" r="3" fill="currentColor" />
      <path
        d="M11 17V5.5L20 4v10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TrackInfo({ track }) {
  if (!track) return null;

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-24 sm:w-24">
        {track.artwork ? (
          <img src={track.artwork} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-text-secondary"
            aria-hidden="true"
          >
            <NoteIcon />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {track.genre}
        </p>
        <h2 className="mt-1 truncate text-xl font-semibold text-text-primary sm:text-2xl">
          {track.title}
        </h2>
        <p className="mt-1 truncate text-sm text-text-secondary">{track.artist}</p>
      </div>
    </div>
  );
}
