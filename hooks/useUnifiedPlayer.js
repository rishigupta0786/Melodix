"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Setting src="" makes browsers fire an "error" event (empty src); removing the
// attribute and calling load() resets the element without that side effect.
function clearAudioSource(audio) {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

/**
 * Unified player hook that manages both HTML5 audio (for Saavn/Local) 
 * and YouTube IFrame player (for YouTube) playback.
 * 
 * Returns an object with:
 * - provider: current track provider ('saavn', 'youtube', 'local', null)
 * - isPlaying: boolean
 * - currentTime: number (seconds)
 * - duration: number (seconds)
 * - play(), pause(), togglePlay(), seek(time), setVolume(value)
 * - audioRef: ref for HTML5 audio element (attach to <audio ref={audioRef} />)
 * - youtubePlayerRef: ref for YouTube player instance
 * - youtubeContainerRef: ref for YouTube player container div
 * - loadTrack(track): call when track changes
 */
export function useUnifiedPlayer({ onEnded, onError } = {}) {
  const [provider, setProvider] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const intentRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);

  const volumeRef = useRef(0.8);
  const isMutedRef = useRef(false);

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // HTML5 Audio event listeners (attached once)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => onEndedRef.current?.();
    // Clearing the source (see clearAudioSource) can raise a spurious error;
    // only real playback failures on an actual source should reach onError.
    const handleError = () => {
      if (!audio.getAttribute("src")) return;
      onErrorRef.current?.(audio.error);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Volume/mute sync for HTML5 audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Same volume/mute for the (hidden) YouTube player
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    const player = youtubePlayerRef.current;
    if (player?.setVolume) player.setVolume(Math.round((isMuted ? 0 : volume) * 100));
  }, [volume, isMuted]);

  // The YouTube player has no timeupdate event, so poll its position while a YouTube track is loaded
  useEffect(() => {
    if (provider !== "youtube") return undefined;
    const timer = setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      setCurrentTime(player.getCurrentTime() || 0);
      const total = player.getDuration?.() || 0;
      if (total) setDuration(total);
    }, 500);
    return () => clearInterval(timer);
  }, [provider]);

  // Load YouTube IFrame API
  const apiLoadedRef = useRef(false);
  const initYouTubeAPI = useCallback(() => {
    if (apiLoadedRef.current) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        apiLoadedRef.current = true;
        resolve();
        return;
      }

      const existingScript = document.getElementById("youtube-api-script");
      if (existingScript) {
        window.onYouTubeIframeAPIReady = () => {
          apiLoadedRef.current = true;
          resolve();
        };
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        apiLoadedRef.current = true;
        resolve();
      };

      const script = document.createElement("script");
      script.id = "youtube-api-script";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube API"));
      document.body.appendChild(script);
    });
  }, []);

  // Initialize YouTube player when container is ready and videoId changes
  const initYouTubePlayerRef = useRef(null);

  const initYouTubePlayer = useCallback(async (videoId) => {
    if (!videoId) return;
    
    // Stable (hidden) wrapper; the YT API replaces its target element and destroy() removes it,
    // so every player gets a fresh child element.
    const wrapper = youtubeContainerRef.current || document.getElementById("youtube-player-container");
    if (!wrapper) {
      console.warn("YouTube player container not ready, retrying...");
      setTimeout(() => initYouTubePlayerRef.current?.(videoId), 100);
      return;
    }

    try {
      await initYouTubeAPI();

      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      wrapper.replaceChildren();
      const container = document.createElement("div");
      wrapper.appendChild(container);

      youtubePlayerRef.current = new window.YT.Player(container, {
        height: "200",
        width: "200",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(Math.round((isMutedRef.current ? 0 : volumeRef.current) * 100));
            setDuration(event.target.getDuration() || 0);
            // Auto-play if user explicitly requested it (clicked play on result)
            if (intentRef.current) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
            if (state === 1) {
              setIsPlaying(true);
              intentRef.current = true;
            } else if (state === 2) {
              setIsPlaying(false);
            } else if (state === 0) {
              setIsPlaying(false);
              onEndedRef.current?.();
            }
          },
          onError: (event) => {
            onErrorRef.current?.(new Error(`YouTube player error: ${event.data}`));
          },
        },
      });
    } catch (error) {
      console.error("Failed to initialize YouTube player:", error);
      onErrorRef.current?.(error);
    }
  }, [initYouTubeAPI]);

  // Update ref after initYouTubePlayer is defined
  useEffect(() => {
    initYouTubePlayerRef.current = initYouTubePlayer;
  }, [initYouTubePlayer]);

  // Load a new track
  const loadTrack = useCallback((track) => {
    if (!track) {
      setProvider(null);
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        clearAudioSource(audioRef.current);
      }
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.stopVideo();
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        youtubePlayerRef.current = null;
      }
      return;
    }

    const newProvider = track.provider || "saavn";
    setProvider(newProvider);
    setCurrentTime(0);
    setDuration(0);

    // ALWAYS clean up previous player regardless of provider type
    // This prevents simultaneous playback when switching sources
    if (audioRef.current) {
      audioRef.current.pause();
      clearAudioSource(audioRef.current);
    }
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.stopVideo();
        youtubePlayerRef.current.destroy();
      } catch (e) {
        // ignore
      }
      youtubePlayerRef.current = null;
    }

    // HTML5 audio (Saavn or Local)
    if ((newProvider === "saavn" || newProvider === "local") && track.streamUrl) {
      const audio = audioRef.current;
      if (audio) {
        audio.autoplay = intentRef.current;
        audio.src = track.streamUrl;
        if (intentRef.current) {
          audio.play().catch(() => setIsPlaying(false));
        }
      }
    }

    // YouTube
    if (newProvider === "youtube" && track.youtubeVideoId) {
      // User explicitly clicked play on result - allow autoplay
      intentRef.current = true;
      initYouTubePlayer(track.youtubeVideoId);
    }
  }, [initYouTubePlayer]);

  // Playback controls
  const play = useCallback(() => {
    intentRef.current = true;
    
    if (provider === "youtube" && youtubePlayerRef.current) {
      youtubePlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.autoplay = true;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [provider]);

  const pause = useCallback(() => {
    intentRef.current = false;
    
    if (provider === "youtube" && youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.autoplay = false;
      audioRef.current.pause();
    }
  }, [provider]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    if (provider === "youtube" && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(time, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [provider]);

  const setVolume = useCallback((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    setIsMuted((muted) => (clamped > 0 ? false : muted));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => !muted);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
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
    youtubePlayerRef,
    youtubeContainerRef,
    loadTrack,
  };
}