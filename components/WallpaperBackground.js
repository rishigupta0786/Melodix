"use client";

import { useEffect, useRef, useState } from "react";

// Renders the last two wallpapers stacked, crossfading the newer one on top.
// The previous image is never removed until the new one has faded in, so the
// background is never blank during a transition.
export default function WallpaperBackground({ wallpaper }) {
  const [layers, setLayers] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!wallpaper) return;

    counterRef.current += 1;
    const key = counterRef.current;

    setLayers((previous) => [...previous, { ...wallpaper, key }].slice(-2));

    const frame = requestAnimationFrame(() => setActiveKey(key));
    return () => cancelAnimationFrame(frame);
  }, [wallpaper]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-bg" aria-hidden="true">
      {layers.map((layer) => (
        <img
          key={layer.key}
          src={layer.url}
          alt={layer.alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: layer.key === activeKey ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75" />
    </div>
  );
}
