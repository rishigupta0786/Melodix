"use client";

import { useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MobileGenreSelector from "@/components/MobileGenreSelector";
import MusicPlayer from "@/components/MusicPlayer";
import WallpaperBackground from "@/components/WallpaperBackground";
import { useMusicQueue } from "@/hooks/useMusicQueue";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useWallpaperRotation } from "@/hooks/useWallpaperRotation";

export default function Home() {
  const {
    genres,
    selectedGenre,
    selectGenre,
    tracks,
    currentTrack,
    isLoading,
    error,
    goToNext,
    goToPrevious,
    dropCurrentTrack,
  } = useMusicQueue();

  const { wallpaper } = useWallpaperRotation();

  const handleEnded = useCallback(() => {
    goToNext();
  }, [goToNext]);

  const handleTrackError = useCallback(() => {
    dropCurrentTrack();
  }, [dropCurrentTrack]);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
  } = useAudioPlayer({
    track: currentTrack,
    onEnded: handleEnded,
    onError: handleTrackError,
  });

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
    } else {
      goToPrevious();
    }
  }, [currentTime, seek, goToPrevious]);

  const isEmpty = !isLoading && !error && tracks.length === 0;

  return (
    <div className="relative min-h-screen w-full">
      <WallpaperBackground wallpaper={wallpaper} />
      <audio ref={audioRef} preload="metadata" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <Sidebar
          genres={genres}
          selectedGenre={selectedGenre}
          onSelect={selectGenre}
          className="hidden lg:flex"
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:hidden">
            <p className="text-base font-semibold tracking-tight text-text-primary">
              Vibe Coding
            </p>
          </header>

          <div className="px-4 pt-3 sm:px-6 lg:hidden">
            <MobileGenreSelector
              genres={genres}
              selectedGenre={selectedGenre}
              onSelect={selectGenre}
            />
          </div>

          <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
            <MusicPlayer
              isLoading={isLoading}
              error={error}
              isEmpty={isEmpty}
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={togglePlay}
              onPrevious={handlePrevious}
              onNext={goToNext}
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              onSeek={seek}
            />
          </main>

          <div className="h-[max(1rem,env(safe-area-inset-bottom))] lg:hidden" />
        </div>
      </div>
    </div>
  );
}
