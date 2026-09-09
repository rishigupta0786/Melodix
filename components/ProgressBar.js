"use client";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar({ currentTime, duration, onSeek, disabled }) {
  const clampedCurrent = Math.min(currentTime, duration || 0);
  const progress = duration > 0 ? (clampedCurrent / duration) * 100 : 0;

  return (
    <div className="flex w-full items-center gap-3">
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-secondary">
        {formatTime(currentTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={clampedCurrent}
        onChange={(event) => onSeek(Number(event.target.value))}
        disabled={disabled || !duration}
        aria-label="Seek playback position"
        className="focus-ring h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: `linear-gradient(to right, var(--color-accent) ${progress}%, rgb(255 255 255 / 0.1) ${progress}%)`,
        }}
      />
      <span className="w-10 shrink-0 text-xs tabular-nums text-text-secondary">
        {formatTime(duration)}
      </span>
    </div>
  );
}
