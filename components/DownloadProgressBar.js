"use client";

import { useSyncExternalStore } from "react";
import { downloadStore } from "@/services/downloadStore";

function phaseLabel(item) {
  if (item.status === "error") return item.error;
  if (item.percent >= 100) return `Saved to ${item.savedTo || "your device"}`;
  if (item.percent >= 99) return "Saving…";
  if (item.percent >= 90) return "Converting to MP3…";
  if (item.percent > 0) return "Downloading audio…";
  return "Starting…";
}

function StatusIcon({ item }) {
  if (item.status === "error") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadToast({ item }) {
  const isError = item.status === "error";
  const isDone = !isError && item.percent >= 100;
  const percent = Math.round(item.percent);

  return (
    <div className="download-toast glass-panel pointer-events-auto w-full rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-accent">♪</div>
          )}
          {(isDone || isError) && (
            <div
              className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] ${
                isError ? "bg-red-500/60 text-white" : "bg-emerald-500/60 text-white"
              }`}
            >
              <StatusIcon item={item} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
            {!isError && (
              <span className="shrink-0 text-xs font-semibold tabular-nums text-accent-strong">{percent}%</span>
            )}
          </div>
          <p className={`mt-0.5 truncate text-xs ${isError ? "text-red-300" : "text-text-secondary"}`}>
            {phaseLabel(item)}
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isError ? 0 : percent}
        aria-label={`Downloading ${item.title}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            isError ? "bg-red-400" : isDone ? "bg-emerald-400" : "download-bar-fill"
          }`}
          style={{ width: `${isError ? 100 : Math.max(percent, 3)}%` }}
        />
      </div>
    </div>
  );
}

export default function DownloadProgressBar() {
  const downloads = useSyncExternalStore(
    downloadStore.subscribe,
    downloadStore.getSnapshot,
    downloadStore.getServerSnapshot
  );
  const items = Object.entries(downloads);
  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-[24rem] max-w-full flex-col gap-2">
        {items.map(([id, item]) => (
          <DownloadToast key={id} item={item} />
        ))}
      </div>
    </div>
  );
}
