"use client";

import TrackInfo from "./TrackInfo";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";

function StatusMessage({ children }) {
  return (
    <div className="flex min-h-[5rem] items-center justify-center text-center sm:min-h-[6rem]">
      <p className="text-sm text-text-secondary">{children}</p>
    </div>
  );
}

export default function MusicPlayer({
  isLoading,
  error,
  isEmpty,
  track,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onPrevious,
  onNext,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  onSeek,
}) {
  const controlsDisabled = isLoading || Boolean(error) || isEmpty;

  return (
    <div className="glass-panel flex w-full max-w-2xl flex-col gap-6 rounded-3xl px-5 py-6 sm:px-8 sm:py-7">
      {isLoading ? (
        <StatusMessage>Loading your vibe...</StatusMessage>
      ) : error ? (
        <StatusMessage>{error}</StatusMessage>
      ) : isEmpty ? (
        <StatusMessage>No tracks found for this genre. Try another vibe.</StatusMessage>
      ) : (
        <TrackInfo track={track} />
      )}

      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        disabled={controlsDisabled}
      />

      <PlayerControls
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onPrevious={onPrevious}
        onNext={onNext}
        disabled={controlsDisabled}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />
    </div>
  );
}
