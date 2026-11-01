"use client";

import { useCallback, useSyncExternalStore } from "react";
import { downloadStore } from "@/services/downloadStore";
import { prepareSave, save } from "@/services/downloadLocation";

// YouTube tracks are converted server-side; online (JioSaavn) tracks are fetched from their stream URL.
function sourceParam(track) {
  return track.youtubeVideoId
    ? new URLSearchParams({ v: track.youtubeVideoId })
    : new URLSearchParams({ src: track.streamUrl });
}

async function startDownload(track) {
  const id = track.id;
  const title = track.title || "song";
  // Started synchronously: it may need to ask permission for the chosen folder, which requires the click gesture.
  const targetPromise = prepareSave();
  downloadStore.update(id, {
    title,
    artist: track.artist,
    thumbnail: track.thumbnail || track.artwork,
    percent: 0,
    status: "downloading",
    error: null,
  });

  const target = await targetPromise;
  const source = new EventSource(`/api/youtube/download?${sourceParam(track)}`);

  source.addEventListener("progress", (event) => {
    downloadStore.update(id, { percent: JSON.parse(event.data).percent });
  });

  source.addEventListener("done", async (event) => {
    source.close();
    downloadStore.update(id, { percent: 99 });
    const { token, ext } = JSON.parse(event.data);
    try {
      const savedTo = await save({ token, title, ext, target });
      downloadStore.update(id, { percent: 100, savedTo });
      setTimeout(() => downloadStore.remove(id), 3000);
    } catch (error) {
      downloadStore.update(id, { status: "error", error: error?.message || "Could not save the file." });
      setTimeout(() => downloadStore.remove(id), 6000);
    }
  });

  // Server-sent `error` event carries a message; a bare connection error does not.
  source.addEventListener("error", (event) => {
    source.close();
    let message = "Download failed.";
    try {
      message = JSON.parse(event.data).message || message;
    } catch {}
    downloadStore.update(id, { status: "error", error: message });
    setTimeout(() => downloadStore.remove(id), 6000);
  });
}

export function useSongDownload(track) {
  const downloads = useSyncExternalStore(
    downloadStore.subscribe,
    downloadStore.getSnapshot,
    downloadStore.getServerSnapshot
  );
  const state = downloads[track?.id];

  const download = useCallback(() => {
    if (!track?.youtubeVideoId && !track?.streamUrl) return;
    if (downloadStore.getSnapshot()[track.id]?.status === "downloading") return;
    startDownload(track);
  }, [track]);

  return {
    download,
    isDownloading: state?.status === "downloading",
    percent: state?.percent ?? 0,
    error: state?.status === "error" ? state.error : null,
  };
}
