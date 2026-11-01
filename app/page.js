"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import DownloadSettings from "@/components/DownloadSettings";
import MobileGenreSelector from "@/components/MobileGenreSelector";
import MusicPlayer from "@/components/MusicPlayer";
import PlayerControls from "@/components/PlayerControls";
import { FavoriteButton, DownloadButton } from "@/components/TrackActions";
import WallpaperBackground from "@/components/WallpaperBackground";
import YouTubeSearch from "@/components/YouTubeSearch";
import YouTubeResultCard from "@/components/YouTubeResultCard";
import LocalMusic from "@/components/LocalMusic";
import { useMusicQueue } from "@/hooks/useMusicQueue";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { useWallpaperRotation } from "@/hooks/useWallpaperRotation";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalMusic } from "@/hooks/useLocalMusic";
import { toLocalTrack } from "@/services/localTrack";
import { GENRES } from "@/services/genres";

export default function Home() {
  // Navigation state
  const [activeSection, setActiveSection] = useState("online"); // 'online', 'youtube', 'local'
  const [activeGenre, setActiveGenre] = useState(GENRES[0].id);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);

  // Section definitions
  const sections = useMemo(() => [
    {
      id: "online",
      label: "Online",
      items: GENRES,
    },
    {
      id: "youtube",
      label: "YouTube",
      items: [{ id: "search", label: "Search" }],
    },
    {
      id: "local",
      label: "Local",
      items: [], // Local music folders are browsed inside the section itself
    },
    {
      id: "favorites",
      label: "Favorites",
      items: [], // Saved songs from every source (Online, YouTube, Local)
    },
  ], []);

  // Capacitor Splash Screen - hide when app is ready
  useEffect(() => {
    if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
      import("@capacitor/splash-screen").then(({ SplashScreen }) => {
        SplashScreen.hide();
      }).catch(() => {});
    }
  }, []);

  // Online music queue (existing JioSaavn)
  const {
    genres,
    selectedGenre: queueSelectedGenre,
    selectGenre: queueSelectGenre,
    tracks: queueTracks,
    currentTrack: queueCurrentTrack,
    isLoading: queueIsLoading,
    error: queueError,
    goToNext,
    goToPrevious,
    dropCurrentTrack,
  } = useMusicQueue();

  // YouTube search
  const {
    results: youtubeResults,
    isLoading: youtubeIsLoading,
    error: youtubeError,
    search: youtubeSearch,
    clear: youtubeClear,
  } = useYouTubeSearch();

  // Favorites
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [favoritesQuery, setFavoritesQuery] = useState("");
  const visibleFavorites = useMemo(() => {
    const needle = favoritesQuery.trim().toLowerCase();
    if (!needle) return favorites;
    return favorites.filter((track) =>
      `${track.title} ${track.artist}`.toLowerCase().includes(needle)
    );
  }, [favorites, favoritesQuery]);

  // State to track the currently playing YouTube track
  const [currentYouTubeTrack, setCurrentYouTubeTrack] = useState(null);

  // Local Music: one shared library so scanning/selection survive switching sections
  const localLibrary = useLocalMusic();
  const { allTracks: localAllTracks, createObjectURL: createLocalUrl } = localLibrary;
  const [currentLocalTrack, setCurrentLocalTrack] = useState(null);
  const localQueueRef = useRef([]);
  const localUrlRef = useRef(null);

  const playNextYouTubeTrack = useCallback(() => {
    if (!currentYouTubeTrack) return;
    
    let nextTrack = null;
    if (activeSection === "favorites") {
      const currentIndex = visibleFavorites.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex !== -1 && currentIndex < visibleFavorites.length - 1) {
        nextTrack = visibleFavorites[currentIndex + 1];
      } else if (visibleFavorites.length > 0) {
        nextTrack = visibleFavorites[0]; // Loop back to start
      }
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      const currentIndex = youtubeResults.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex !== -1 && currentIndex < youtubeResults.length - 1) {
        nextTrack = youtubeResults[currentIndex + 1];
      } else if (youtubeResults.length > 0) {
        nextTrack = youtubeResults[0]; // Loop back to start
      }
    }

    if (nextTrack) {
      setCurrentYouTubeTrack(nextTrack);
      // We will call loadTrack on nextTrack in handleEnded or handleNext which uses this callback.
      // But wait, loadTrack is not in the dependency array yet. Let's just return nextTrack.
    }
    return nextTrack;
  }, [currentYouTubeTrack, activeSection, visibleFavorites, youtubeResults]);

  const playPreviousYouTubeTrack = useCallback(() => {
    if (!currentYouTubeTrack) return;
    
    let prevTrack = null;
    if (activeSection === "favorites") {
      const currentIndex = visibleFavorites.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex > 0) {
        prevTrack = visibleFavorites[currentIndex - 1];
      } else if (visibleFavorites.length > 0) {
        prevTrack = visibleFavorites[visibleFavorites.length - 1]; // Loop to end
      }
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      const currentIndex = youtubeResults.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex > 0) {
        prevTrack = youtubeResults[currentIndex - 1];
      } else if (youtubeResults.length > 0) {
        prevTrack = youtubeResults[youtubeResults.length - 1]; // Loop to end
      }
    }

    if (prevTrack) {
      setCurrentYouTubeTrack(prevTrack);
    }
    return prevTrack;
  }, [currentYouTubeTrack, activeSection, visibleFavorites, youtubeResults]);

  const isAutoPlaying = useRef(false);
  const [localStepRequest, setLocalStepRequest] = useState(null);
  const requestLocalStep = useCallback((delta) => {
    setLocalStepRequest((previous) => ({ delta, id: (previous?.id ?? 0) + 1 }));
  }, []);

  // Unified player (handles both HTML5 audio and YouTube)
  const handleEnded = useCallback(() => {
    if (activeSection === "online") {
      goToNext();
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      const nextTrack = playNextYouTubeTrack();
      if (nextTrack) {
        isAutoPlaying.current = true;
      }
    } else if (activeSection === "local") {
      requestLocalStep(1);
    }
  }, [activeSection, goToNext, playNextYouTubeTrack, requestLocalStep]);

  const handleTrackError = useCallback(() => {
    if (activeSection === "online") {
      dropCurrentTrack();
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      const nextTrack = playNextYouTubeTrack();
      if (nextTrack) {
        isAutoPlaying.current = true;
      }
    }
  }, [activeSection, dropCurrentTrack, playNextYouTubeTrack]);

  const {
    provider,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    audioRef,
    youtubeContainerRef,
    loadTrack,
  } = useUnifiedPlayer({
    onEnded: handleEnded,
    onError: handleTrackError,
  });

  // Open a local file and start playing it. Returns false if the file could not be read.
  const startLocalFile = useCallback(async (file) => {
    const url = await createLocalUrl(file);
    if (!url) return false;
    const previousUrl = localUrlRef.current;
    localUrlRef.current = url;
    loadTrack({ ...toLocalTrack(file), streamUrl: url });
    play();
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    return true;
  }, [createLocalUrl, loadTrack, play]);

  // Move through the list the user last played from (wraps around)
  const stepLocalTrack = useCallback((delta) => {
    const queue = localQueueRef.current;
    if (!queue.length || !currentLocalTrack) return;
    const index = queue.findIndex((f) => `local-${f.path}` === currentLocalTrack.id);
    const next = queue[(index + delta + queue.length) % queue.length];
    setCurrentLocalTrack(toLocalTrack(next));
    startLocalFile(next);
  }, [currentLocalTrack, startLocalFile]);

  // handleEnded is created before the player exists, so it asks for a step and this effect performs it
  const stepLocalRef = useRef(null);
  useEffect(() => {
    stepLocalRef.current = stepLocalTrack;
  }, [stepLocalTrack]);
  useEffect(() => {
    if (localStepRequest) stepLocalRef.current?.(localStepRequest.delta);
  }, [localStepRequest]);

  // Derived state
  // Everything played from the YouTube section (YouTube results/favorites, saved online songs) is audio-only,
  // so it gets the audio player card; the YouTube video itself stays hidden.
  const showYouTubeAudioPlayer =
    (activeSection === "youtube" || activeSection === "favorites") &&
    Boolean(currentYouTubeTrack) &&
    (provider === "youtube" || provider === "saavn" || provider === "local");
  const youtubeAudioTrack = currentYouTubeTrack && {
    ...currentYouTubeTrack,
    artwork: currentYouTubeTrack.artwork || currentYouTubeTrack.thumbnail,
    genre: currentYouTubeTrack.provider === "youtube" ? "YouTube" : "Favorites",
  };

  // Watch for currentYouTubeTrack changes from auto-play (next/prev)
  useEffect(() => {
    if (isAutoPlaying.current && currentYouTubeTrack) {
      isAutoPlaying.current = false;
      if (currentYouTubeTrack.provider === "local") {
        const file = localAllTracks.find((f) => `local-${f.path}` === currentYouTubeTrack.id);
        if (file) startLocalFile(file);
      } else {
        loadTrack(currentYouTubeTrack);
      }
    }
  }, [currentYouTubeTrack, loadTrack, localAllTracks, startLocalFile]);

  // Load track into unified player when current track changes
  useEffect(() => {
    if (activeSection === "online") {
      loadTrack(queueCurrentTrack);
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      // Manual plays handle their own loadTrack calls
    }
  }, [activeSection, queueCurrentTrack, loadTrack]);

  const handlePrevious = useCallback(() => {
    if (activeSection === "online") {
      if (currentTime > 3) {
        seek(0);
      } else {
        goToPrevious();
      }
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      if (currentTime > 3) {
        seek(0);
      } else {
        const prevTrack = playPreviousYouTubeTrack();
        if (prevTrack) {
          isAutoPlaying.current = true;
        }
      }
    } else if (activeSection === "local") {
      if (currentTime > 3) {
        seek(0);
      } else {
        stepLocalTrack(-1);
      }
    }
  }, [activeSection, currentTime, seek, goToPrevious, playPreviousYouTubeTrack, stepLocalTrack]);

  const handleNext = useCallback(() => {
    if (activeSection === "online") {
      goToNext();
    } else if (activeSection === "youtube" || activeSection === "favorites") {
      const nextTrack = playNextYouTubeTrack();
      if (nextTrack) {
        isAutoPlaying.current = true;
      }
    } else if (activeSection === "local") {
      stepLocalTrack(1);
    }
  }, [activeSection, goToNext, playNextYouTubeTrack, stepLocalTrack]);

  // Section selection handlers
  const handleSelectSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setShowYouTubeSearch(sectionId === "youtube");
    
    // Reset genre when switching to online
    if (sectionId === "online") {
      setActiveGenre(queueSelectedGenre);
    }
  }, [queueSelectedGenre]);

  const handleSelectGenre = useCallback((genreId, targetSection) => {
    setActiveGenre(genreId);
    // Only trigger queue fetch if the target section is "online"
    if (targetSection === "online") {
      queueSelectGenre(genreId);
    }
  }, [queueSelectGenre]);

  // YouTube search handler
  const handleYouTubeSearch = useCallback((query) => {
    youtubeSearch(query);
  }, [youtubeSearch]);

  // Play a YouTube result
  const handlePlayYouTubeTrack = useCallback((track) => {
    setCurrentYouTubeTrack(track);
    loadTrack(track);
    // Switch to YouTube section to show player
    setActiveSection("youtube");
  }, [loadTrack]);

  // Play a YouTube favorite
  const handlePlayFavorite = useCallback((track) => {
    if (track.provider === "local") {
      // Local favorites only store the file's path; the file itself comes from the connected library.
      const file = localAllTracks.find((f) => `local-${f.path}` === track.id);
      if (!file) {
        // Library not connected (or file gone): send the user to Local, which offers to reconnect.
        setActiveSection("local");
        return;
      }
      setCurrentYouTubeTrack(track);
      startLocalFile(file);
    } else {
      setCurrentYouTubeTrack(track);
      loadTrack(track);
      // YouTube tracks autoplay on their own; audio tracks only autoplay if the user hadn't paused.
      if (track.provider !== "youtube") play();
    }
    setActiveSection("favorites");
  }, [loadTrack, play, localAllTracks, startLocalFile]);

  // Play a local music track from the Local section, remembering the list it came from for next/previous
  const handlePlayLocalTrack = useCallback(async (file, queue) => {
    localQueueRef.current = queue?.length ? queue : [file];
    setCurrentLocalTrack(toLocalTrack(file));
    setActiveSection("local");
    await startLocalFile(file);
  }, [startLocalFile]);

  // Compute current track based on active section
  const currentTrack = activeSection === "online" ? queueCurrentTrack : null;
  
  // Compute loading/error/empty states
  const isLoading = activeSection === "online" ? queueIsLoading : 
    activeSection === "youtube" ? youtubeIsLoading : false;
  const error = activeSection === "online" ? queueError : 
    activeSection === "youtube" ? youtubeError : null;
  const isEmpty = !isLoading && !error && 
    (activeSection === "online" ? queueTracks.length === 0 : 
     activeSection === "youtube" ? youtubeResults.length === 0 : true);

  const { wallpaper } = useWallpaperRotation();

  return (
    <div className="relative min-h-screen w-full">
      <WallpaperBackground wallpaper={wallpaper} />
      <audio ref={audioRef} preload="metadata" />
      {/* YouTube plays through a hidden iframe: audio only, no video shown */}
      <div
        className="pointer-events-none fixed -left-[9999px] top-0 h-[200px] w-[200px] overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <div id="youtube-player-container" ref={youtubeContainerRef} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <Sidebar
          sections={sections}
          activeSection={activeSection}
          activeGenre={activeSection === "youtube" ? "search" : activeGenre}
          onSelectSection={handleSelectSection}
          onSelectGenre={handleSelectGenre}
          className="hidden lg:flex"
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:hidden">
            <p className="text-base font-semibold tracking-tight text-text-primary">
              Vibe Coding
            </p>
            <DownloadSettings className="h-10 w-10 justify-center" />
          </header>

          {/* Mobile navigation tabs */}
          <div className="px-4 pt-3 pb-2 sm:px-6 lg:hidden border-b border-border">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="Music sources">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSelectSection(section.id)}
                  className={`focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? "bg-white/10 text-text-primary"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Genre Selector - below tabs */}
          <MobileGenreSelector
            sections={sections}
            activeSection={activeSection}
            activeGenre={activeSection === "youtube" ? "search" : activeGenre}
            onSelectSection={handleSelectSection}
            onSelectGenre={handleSelectGenre}
            className="px-4 pt-3 pb-2 sm:px-6 lg:hidden"
          />

          {/* YouTube Search Bar + YouTube Player (when playing) */}
          {(activeSection === "youtube" || activeSection === "favorites") && (
            <div className="px-4 py-3 sm:px-6 border-b border-border">
              {activeSection === "youtube" ? (
                <YouTubeSearch onSearch={handleYouTubeSearch} />
              ) : (
                <YouTubeSearch
                  key="favorites-search"
                  onSearch={setFavoritesQuery}
                  placeholder="Search your favorites..."
                  ariaLabel="Search favorites"
                />
              )}
              {showYouTubeAudioPlayer && (
                <div className="flex w-full justify-center">
                  <MusicPlayer
                    isLoading={false}
                    error={null}
                    isEmpty={false}
                    track={youtubeAudioTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onTogglePlay={togglePlay}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    volume={volume}
                    isMuted={isMuted}
                    onVolumeChange={setVolume}
                    onToggleMute={toggleMute}
                    onSeek={seek}
                    controlsOnMobile
                  />
                </div>
              )}
            </div>
          )}

          <main className="flex flex-1 flex-col items-center justify-start px-4 py-4 sm:px-6 pb-28 lg:pb-8 overflow-y-auto">
            {/* Online Music Player */}
            {activeSection === "online" && (
              <div className="max-lg:mt-auto max-lg:mb-8 w-full flex justify-center">
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
                  onNext={handleNext}
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  onSeek={seek}
                />
              </div>
            )}

            {/* YouTube search results and the shared Favorites list use the same song cards */}
            {(activeSection === "youtube" || activeSection === "favorites") && (
              <div className="w-full max-w-2xl">
                {/* YouTube Content */}
                <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 sm:p-8 mt-6 mb-6">
                  {activeSection === "youtube" ? (
                    <>
                      {youtubeIsLoading ? (
                        <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
                          <p className="text-sm text-text-secondary">Searching YouTube...</p>
                        </div>
                      ) : youtubeError ? (
                        <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
                          <p className="text-sm text-text-secondary">{youtubeError}</p>
                        </div>
                      ) : youtubeResults.length === 0 ? (
                        <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
                          <p className="text-sm text-text-secondary">
                            Search YouTube to discover music videos
                          </p>
                        </div>
                      ) : (
                        <>
                          <h2 className="px-2 py-2 text-sm font-medium text-text-secondary">
                            Search Results ({youtubeResults.length})
                          </h2>
                          <ul className="flex flex-col gap-1" role="list">
                            {youtubeResults.map((track) => (
                              <YouTubeResultCard
                                key={track.id}
                                track={track}
                                onPlay={handlePlayYouTubeTrack}
                              />
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="px-2 py-2 text-sm font-medium text-text-secondary">
                        Favorites ({visibleFavorites.length}{visibleFavorites.length !== favorites.length ? ` of ${favorites.length}` : ""})
                      </h2>
                      {visibleFavorites.length === 0 ? (
                        <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
                          <p className="text-sm text-text-secondary">
                            {favorites.length === 0
                              ? "No favorites yet. Click the heart icon on any song to save it."
                              : "No favorites match your search."}
                          </p>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-1" role="list">
                          {visibleFavorites.map((track) => (
                            <YouTubeResultCard
                              key={track.id}
                              track={track}
                              onPlay={handlePlayFavorite}
                            />
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Local Music Section */}
            {activeSection === "local" && (
              <div className="flex w-full max-w-4xl flex-col gap-4">
                {currentLocalTrack && provider === "local" && (
                  <div className="flex w-full justify-center">
                    <MusicPlayer
                      isLoading={false}
                      error={null}
                      isEmpty={false}
                      track={{ ...currentLocalTrack, genre: "Local" }}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      onTogglePlay={togglePlay}
                      onPrevious={handlePrevious}
                      onNext={handleNext}
                      volume={volume}
                      isMuted={isMuted}
                      onVolumeChange={setVolume}
                      onToggleMute={toggleMute}
                      onSeek={seek}
                      controlsOnMobile
                    />
                  </div>
                )}
                <LocalMusic
                  library={localLibrary}
                  currentTrackId={provider === "local" ? currentLocalTrack?.id : null}
                  isPlaying={isPlaying}
                  onPlayTrack={handlePlayLocalTrack}
                />
              </div>
            )}
          </main>

          {/* Mobile Fixed Bottom Player Bar - show for online section with track */}
          {activeSection === "online" && currentTrack && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="glass-panel mx-4 mb-6 mt-2 rounded-3xl p-5 border-t border-white/10">
                <PlayerControls
                  isPlaying={isPlaying}
                  onTogglePlay={togglePlay}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  disabled={
                    activeSection === "online"
                      ? isLoading || Boolean(error) || isEmpty
                      : !isPlaying
                  }
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  leading={<FavoriteButton track={currentTrack} />}
                  trailing={<DownloadButton track={currentTrack} />}
                />
              </div>
            </div>
          )}

          <div className="h-[max(1rem,env(safe-area-inset-bottom))] lg:hidden" />
        </div>
      </div>
    </div>
  );
}