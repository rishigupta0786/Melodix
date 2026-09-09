"use client";

function IconButton({ label, onClick, disabled, children, size = "md" }) {
  const sizing = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`focus-ring flex ${sizing} items-center justify-center rounded-full text-text-primary transition-colors hover:bg-white/10 active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <polygon points="7,4 20,12 7,20" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="5" y="5" width="2" height="14" rx="1" fill="currentColor" />
      <polygon points="18,5 18,19 8,12" fill="currentColor" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="17" y="5" width="2" height="14" rx="1" fill="currentColor" />
      <polygon points="6,5 6,19 16,12" fill="currentColor" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path
        d="M16.5 8.5a5 5 0 010 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M19 6.2a8.3 8.3 0 010 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <line
        x1="16"
        y1="9"
        x2="21"
        y2="15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="21"
        y1="9"
        x2="16"
        y2="15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PlayerControls({
  isPlaying,
  onTogglePlay,
  onPrevious,
  onNext,
  disabled,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) {
  const isSilent = isMuted || volume === 0;

  return (
    <div className="flex w-full items-center justify-center gap-2 sm:justify-between">
      <div className="hidden items-center gap-2 sm:flex">
        <IconButton
          label={isSilent ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          disabled={disabled}
        >
          {isSilent ? <MuteIcon /> : <VolumeIcon />}
        </IconButton>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label="Volume"
          className="focus-ring h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-accent)]"
        />
      </div>

      <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-2">
        <IconButton label="Previous track" onClick={onPrevious} disabled={disabled}>
          <PreviousIcon />
        </IconButton>
        <IconButton
          label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
          disabled={disabled}
          size="lg"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton label="Next track" onClick={onNext} disabled={disabled}>
          <NextIcon />
        </IconButton>
      </div>

      <div className="hidden w-24 sm:block" aria-hidden="true" />
    </div>
  );
}
