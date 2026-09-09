"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWallpaper, preloadImage } from "@/services/wallpaperService";

// ~18 minutes, inside the spec's 15-20 minute window.
const DEFAULT_INTERVAL_MS = 18 * 60 * 1000;

export function useWallpaperRotation({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const [wallpaper, setWallpaper] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const loadNext = useCallback(async () => {
    try {
      const next = await fetchWallpaper();
      await preloadImage(next.url);
      if (!mountedRef.current) return;
      setWallpaper(next);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      // Keep whatever wallpaper is currently displayed; never blank the background.
      setError(err?.message || "Could not load a new wallpaper.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // `loadNext` is only ever handed to timer APIs as a callback (fired once on
  // the next tick, then repeatedly on an interval) rather than invoked
  // directly, so this effect only ever subscribes to an external system.
  useEffect(() => {
    const timeoutId = setTimeout(loadNext, 0);
    const intervalId = setInterval(loadNext, intervalMs);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [loadNext, intervalMs]);

  return { wallpaper, error };
}
