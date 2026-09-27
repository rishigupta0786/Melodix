"use client";

import { useEffect, useRef, useState } from "react";

const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

export default function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onError,
  className = "",
}) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const apiLoadedRef = useRef(false);
  const initAttemptedRef = useRef(false);

  // Use refs for callbacks to avoid effect dependencies
  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        apiLoadedRef.current = true;
        initPlayer();
      } else if (!document.getElementById("youtube-api-script")) {
        const script = document.createElement("script");
        script.id = "youtube-api-script";
        script.src = YOUTUBE_API_URL;
        script.async = true;
        document.body.appendChild(script);
        window.onYouTubeIframeAPIReady = initPlayer;
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    };

    const initPlayer = () => {
      if (!containerRef.current || !videoId) return;

      try {
        const ytPlayer = new window.YT.Player(containerRef.current, {
          height: "100%",
          width: "100%",
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
              playerRef.current = event.target;
              setIsReady(true);
              onReadyRef.current?.(event.target);
            },
            onStateChange: (event) => {
              onStateChangeRef.current?.(event.data, event.target);
            },
            onError: (event) => {
              onErrorRef.current?.(event.data, event.target);
            },
          },
        });
      } catch (error) {
        console.error("Failed to initialize YouTube player:", error);
      }
    };

    loadAPI();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        playerRef.current = null;
        setIsReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoId is intentionally not a dependency; this effect runs once on mount
  }, []);

  useEffect(() => {
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full rounded-xl overflow-hidden bg-black ${className}`}
      aria-label="YouTube Player"
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-text-secondary">Loading player...</div>
        </div>
      )}
    </div>
  );
}