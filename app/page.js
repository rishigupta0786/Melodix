"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import MobileGenreSelector from "@/components/MobileGenreSelector";
import MusicPlayer from "@/components/MusicPlayer";
import PlayerControls from "@/components/PlayerControls";
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
import { GENRES } from "@/services/genres";

export default function Home() {
  // Navigation state
  const [activeSection, setActiveSection] = useState("online"); // 'online', 'youtube', 'local'
  const [activeGenre, setActiveGenre] = useState(GENRES[0].id);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [activeYouTubeTab, setActiveYouTubeTab] = useState("search"); // 'search', 'favorites'

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
      items: [
        { id: "search", label: "Search" },
        { id: "favorites", label: "Favorites" },
      ],
    },
    {
      id: "local",
      label: "Local",
      items: [], // Local music folders loaded dynamically
    },
  ], []);

  // Capacitor Splash Screen - hide when app is ready
  useEffect(() => {
    if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform) {
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

  // State to track the currently playing YouTube track
  const [currentYouTubeTrack, setCurrentYouTubeTrack] = useState(null);

  // Local Music
  const {
    rootFolder: localRootFolder,
    loading: localLoading,
    error: localError,
    allTracks: localAllTracks,
    pickDirectory: localPickDirectory,
    removeDirectory: localRemoveDirectory,
    hasPermission: localHasPermission,
  } = useLocalMusic();

  const playNextYouTubeTrack = useCallback(() => {
    if (!currentYouTubeTrack) return;
    
    let nextTrack = null;
    if (activeYouTubeTab === "favorites") {
      const currentIndex = favorites.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex !== -1 && currentIndex < favorites.length - 1) {
        nextTrack = favorites[currentIndex + 1];
      } else if (favorites.length > 0) {
        nextTrack = favorites[0]; // Loop back to start
      }
    } else if (activeYouTubeTab === "search") {
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
  }, [currentYouTubeTrack, activeYouTubeTab, favorites, youtubeResults]);

  const playPreviousYouTubeTrack = useCallback(() => {
    if (!currentYouTubeTrack) return;
    
    let prevTrack = null;
    if (activeYouTubeTab === "favorites") {
      const currentIndex = favorites.findIndex(t => t.id === currentYouTubeTrack.id);
      if (currentIndex > 0) {
        prevTrack = favorites[currentIndex - 1];
      } else if (favorites.length > 0) {
        prevTrack = favorites[favorites.length - 1]; // Loop to end
      }
    } else if (activeYouTubeTab === "search") {
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
  }, [currentYouTubeTrack, activeYouTubeTab, favorites, youtubeResults]);

  const isAutoPlaying = useRef(false);

  // Unified player (handles both HTML5 audio and YouTube)
  const handleEnded = useCallback(() => {
    if (activeSection === "online") {
      goToNext();
    } else if (activeSection === "youtube") {
      const nextTrack = playNextYouTubeTrack();
      if (nextTrack) {
        isAutoPlaying.current = true;
      }
    }
  }, [activeSection, goToNext, playNextYouTubeTrack]);

  const handleTrackError = useCallback(() => {
    if (activeSection === "online") {
      dropCurrentTrack();
    } else if (activeSection === "youtube") {
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

  // Derived state
  const showYouTubePlayer = provider === "youtube";

  // Watch for currentYouTubeTrack changes from auto-play (next/prev)
  useEffect(() => {
    if (isAutoPlaying.current && currentYouTubeTrack) {
      isAutoPlaying.current = false;
      loadTrack(currentYouTubeTrack);
    }
  }, [currentYouTubeTrack, loadTrack]);

  // Load track into unified player when current track changes
  useEffect(() => {
    if (activeSection === "online") {
      loadTrack(queueCurrentTrack);
    } else if (activeSection === "youtube") {
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
    } else if (activeSection === "youtube") {
      if (currentTime > 3) {
        seek(0);
      } else {
        const prevTrack = playPreviousYouTubeTrack();
        if (prevTrack) {
          isAutoPlaying.current = true;
        }
      }
    }
  }, [activeSection, currentTime, seek, goToPrevious, playPreviousYouTubeTrack]);

  const handleNext = useCallback(() => {
    if (activeSection === "online") {
      goToNext();
    } else if (activeSection === "youtube") {
      const nextTrack = playNextYouTubeTrack();
      if (nextTrack) {
        isAutoPlaying.current = true;
      }
    }
  }, [activeSection, goToNext, playNextYouTubeTrack]);

  // Section selection handlers
  const handleSelectSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setShowYouTubeSearch(sectionId === "youtube");
    
    // Reset genre when switching to online
    if (sectionId === "online") {
      setActiveGenre(queueSelectedGenre);
    }
    // Reset YouTube tab when entering YouTube section
    if (sectionId === "youtube") {
      setActiveYouTubeTab("search");
    }
  }, [queueSelectedGenre]);

  const handleSelectGenre = useCallback((genreId, targetSection) => {
    setActiveGenre(genreId);
    // Handle YouTube sub-tabs
    if (targetSection === "youtube") {
      setActiveYouTubeTab(genreId); // 'search' or 'favorites'
    }
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
    setActiveYouTubeTab("search");
  }, [loadTrack]);

  // Play a YouTube favorite
  const handlePlayFavorite = useCallback((track) => {
    setCurrentYouTubeTrack(track);
    loadTrack(track);
    setActiveSection("youtube");
    setActiveYouTubeTab("favorites");
  }, [loadTrack]);

  // Play a local music track
  const handlePlayLocalTrack = useCallback(async (track) => {
    const url = await track.handle.getFile().then(f => URL.createObjectURL(f));
    loadTrack({
      ...track,
      provider: "local",
      streamUrl: url,
      id: `local-${track.path}`,
      title: track.name.replace(/\.[^.]+$/, ""),
      artist: "Local Music",
    });
    setActiveSection("local");
  }, [loadTrack]);

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

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <Sidebar
          sections={sections}
          activeSection={activeSection}
          activeGenre={activeGenre}
          onSelectSection={handleSelectSection}
          onSelectGenre={handleSelectGenre}
          className="hidden lg:flex"
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:hidden">
            <p className="text-base font-semibold tracking-tight text-text-primary">
              Vibe Coding
            </p>
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
            activeGenre={activeGenre}
            onSelectSection={handleSelectSection}
            onSelectGenre={handleSelectGenre}
            className="px-4 pt-3 pb-2 sm:px-6 lg:hidden"
          />

          {/* YouTube Search Bar + YouTube Player (when playing) */}
          {(activeSection === "youtube") && (
            <div className="px-4 py-3 sm:px-6 border-b border-border">
              <YouTubeSearch onSearch={handleYouTubeSearch} />
              {/* YouTube Player - always rendered for ref availability, shown when playing */}
              <div className={`w-full max-w-2xl mt-4 mx-auto ${showYouTubePlayer ? "block" : "hidden"}`}>
                <div 
                  id="youtube-player-container"
                  ref={youtubeContainerRef}
                  className="aspect-video w-full rounded-xl overflow-hidden bg-black"
                  aria-label="YouTube Player"
                />
              </div>
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

            {/* YouTube Section - Search & Favorites tabs */}
            {activeSection === "youtube" && (
              <div className="w-full max-w-2xl">
                {/* YouTube Sub-tabs */}
                <div className="px-4 py-2 sm:px-6 border-b border-border">
                  <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-2" aria-label="YouTube sections">
                    <button
                      type="button"
                      onClick={() => setActiveYouTubeTab("search")}
                      className={`focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeYouTubeTab === "search"
                          ? "bg-white/10 text-text-primary"
                          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveYouTubeTab("favorites")}
                      className={`focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeYouTubeTab === "favorites"
                          ? "bg-white/10 text-text-primary"
                          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Favorites
                    </button>
                  </nav>
                </div>
                
                {/* YouTube Content */}
                <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 sm:p-8 mt-6 mb-6">
                  {activeYouTubeTab === "search" ? (
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
                        YouTube Favorites ({favorites.length})
                      </h2>
                      {favorites.length === 0 ? (
                        <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
                          <p className="text-sm text-text-secondary">
                            No favorites yet. Search YouTube and click the heart icon to save tracks.
                          </p>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-1" role="list">
                          {favorites.map((track) => (
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
              <div className="w-full max-w-2xl">
                <LocalMusic onPlayTrack={handlePlayLocalTrack} />
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