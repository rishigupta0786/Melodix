"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  NATIVE_DESTINATIONS,
  getLocation,
  isNativeApp,
  pickFolder,
  resetLocation,
  setNativeDestination,
  subscribeLocation,
  supportsFolderPicker,
} from "@/services/downloadLocation";

const FOLDER_ICON = "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z";

function Dialog({ onClose }) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  // Resolved after mount so server and first client render match
  const [mode, setMode] = useState("browser");

  const refresh = useCallback(async () => setLocation(await getLocation()), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(isNativeApp() ? "native" : supportsFolderPicker() ? "folder" : "browser");
    refresh();
    return subscribeLocation(refresh);
  }, [refresh]);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = async () => {
    setError(null);
    try {
      await pickFolder();
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Could not use that folder.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Download location"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#14141b] p-5 shadow-2xl shadow-black/70"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Download location</h2>
            <p className="mt-1 text-xs text-text-secondary">Where songs you download are saved.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-white/10 hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
            <path d={FOLDER_ICON} fill="currentColor" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Saving to</p>
            <p className="truncate text-sm font-medium text-text-primary">{location?.label ?? "…"}</p>
          </div>
        </div>

        {mode === "folder" && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={choose}
              className="focus-ring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-[#0a0a0d] transition-colors hover:bg-accent-strong"
            >
              {location?.kind === "folder" ? "Choose a different folder" : "Choose folder"}
            </button>
            {location?.kind === "folder" && (
              <button
                type="button"
                onClick={resetLocation}
                className="focus-ring rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                Use browser default
              </button>
            )}
            <p className="text-xs text-text-secondary">
              The browser may ask you to allow access to this folder the first time you download after reopening the app.
            </p>
          </div>
        )}

        {mode === "native" && (
          <div className="mt-4 flex flex-col gap-1" role="radiogroup" aria-label="Save folder">
            {NATIVE_DESTINATIONS.map((destination) => {
              const selected = location?.id === destination.id;
              return (
                <button
                  key={destination.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setNativeDestination(destination.id)}
                  className={`focus-ring flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                    selected ? "bg-accent/20 text-text-primary" : "text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${selected ? "bg-accent" : "bg-white/20"}`}
                    aria-hidden="true"
                  />
                  {destination.label}
                </button>
              );
            })}
            <p className="mt-2 text-xs text-text-secondary">
              Android only lets apps write to certain folders. If a download fails, try another one here.
            </p>
          </div>
        )}

        {mode === "browser" && (
          <p className="mt-4 text-sm text-text-secondary">
            This browser doesn&apos;t let websites choose a download folder. Change it in the browser itself, for
            example in Chrome: Settings → Downloads → &ldquo;Ask where to save each file before downloading&rdquo;.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>,
    document.body
  );
}

export default function DownloadSettings({ className = "", label }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Download location"
        title="Download location"
        className={`focus-ring flex items-center gap-2 rounded-full text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
          <path
            d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
      {open && <Dialog onClose={close} />}
    </>
  );
}
