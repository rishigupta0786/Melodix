"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// IndexedDB for persisting directory handles
const DB_NAME = "MusicPlayerDB";
const STORE_NAME = "directoryHandles";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject("No window");
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function saveDirectoryHandle(handle, name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: "musicRoot", handle, name, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDirectoryHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("musicRoot");
    request.onsuccess = () => resolve(request.result?.handle || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearDirectoryHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("musicRoot");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Supported audio extensions
const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wav", ".webm", ".opus"];

function isAudioFile(name) {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

// Web: File System Access API recursive scan
async function scanDirectoryRecursive(dirHandle, path = "") {
  const folders = [];
  const files = [];
  
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "directory") {
      const subResult = await scanDirectoryRecursive(handle, `${path}/${name}`);
      if (subResult.files.length > 0 || subResult.folders.length > 0) {
        folders.push({
          name,
          path: `${path}/${name}`,
          handle,
          folders: subResult.folders,
          files: subResult.files,
          expanded: false,
        });
      }
    } else if (handle.kind === "file" && isAudioFile(name)) {
      files.push({
        name,
        path: `${path}/${name}`,
        handle,
      });
    }
  }
  
  return { folders, files };
}

// Mobile: Capacitor Filesystem recursive scan
async function scanDirectoryCapacitor(Filesystem, path, basePath = "") {
  const folders = [];
  const files = [];
  
  try {
    const result = await Filesystem.readdir({ path, directory: "EXTERNAL" });
    
    for (const entry of result.files) {
      const fullPath = `${path}/${entry.name}`;
      const relativePath = `${basePath}/${entry.name}`;
      
      if (entry.type === "directory") {
        const subResult = await scanDirectoryCapacitor(Filesystem, fullPath, relativePath);
        if (subResult.files.length > 0 || subResult.folders.length > 0) {
          folders.push({
            name: entry.name,
            path: relativePath,
            // On mobile we store the full path instead of handle
            fullPath,
            folders: subResult.folders,
            files: subResult.files,
            expanded: false,
          });
        }
      } else if (entry.type === "file" && isAudioFile(entry.name)) {
        files.push({
          name: entry.name,
          path: relativePath,
          fullPath,
        });
      }
    }
  } catch (e) {
    // Ignore permission errors for individual folders
    console.warn(`Cannot read directory ${path}:`, e.message);
  }
  
  return { folders, files };
}

export function flattenFolders(folders) {
  const result = [];
  for (const folder of folders) {
    result.push(folder);
    if (folder.folders.length > 0) {
      result.push(...flattenFolders(folder.folders));
    }
  }
  return result;
}

// Every file in a folder and all of its subfolders.
export function collectFolderFiles(folder) {
  return [...folder.files, ...folder.folders.flatMap(collectFolderFiles)];
}

function isNativeApp() {
  return typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
}

const MIME_TYPES = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

const mimeFor = (name) => MIME_TYPES[name.split(".").pop().toLowerCase()] || "audio/mpeg";

function buildRoot(result, extras) {
  return {
    name: "Music Library",
    path: "",
    folders: result.folders,
    files: result.files,
    expanded: true,
    ...extras,
  };
}

// Web: remembered folder handles lose read access between sessions until the user re-grants it.
async function hasReadAccess(handle) {
  if (!handle.queryPermission) return true;
  return (await handle.queryPermission({ mode: "read" })) === "granted";
}

export function useLocalMusic() {
  const [rootFolder, setRootFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [Filesystem, setFilesystem] = useState(null);
  const [Preferences, setPreferences] = useState(null);
  // Saved web folder whose read permission must be re-granted by a click
  const [pendingHandle, setPendingHandle] = useState(null);

  const allTracks = useMemo(() => (rootFolder ? collectFolderFiles(rootFolder) : []), [rootFolder]);

  // Detect platform on mount
  useEffect(() => {
    const detectPlatform = async () => {
      const native = isNativeApp();
      setIsMobile(native);
      if (!native) return;

      try {
        const [fs, prefs] = await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/preferences"),
        ]);
        setFilesystem(fs.Filesystem);
        setPreferences(prefs.Preferences);
      } catch (e) {
        console.warn("Capacitor plugins not available:", e);
      }
    };
    detectPlatform();
  }, []);

  const loadWebHandle = useCallback(async (handle) => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanDirectoryRecursive(handle);
      setRootFolder(buildRoot(result, { handle }));
      setPendingHandle(null);
    } catch (e) {
      setError(e.message || "Failed to read the music folder");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMobilePath = useCallback(
    async (fs, musicPath) => {
      setLoading(true);
      setError(null);
      try {
        const result = await scanDirectoryCapacitor(fs, musicPath, "");
        setRootFolder(buildRoot(result, { fullPath: musicPath }));
      } catch (e) {
        setError(e.message || "Failed to read the music folder");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Restore the previously chosen folder
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (isMobile) {
          if (!Filesystem || !Preferences) return;
          const { value } = await Preferences.get({ key: "musicRootPath" });
          if (value && !cancelled) await loadMobilePath(Filesystem, value);
        } else {
          const handle = await getDirectoryHandle();
          if (!handle || cancelled) return;
          if (await hasReadAccess(handle)) await loadWebHandle(handle);
          else setPendingHandle(handle);
        }
      } catch (e) {
        console.error("Failed to restore music folder:", e);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isMobile, Filesystem, Preferences, loadMobilePath, loadWebHandle]);

  // Must run from a click: browsers only show the permission prompt for a user gesture.
  const reconnect = useCallback(async () => {
    if (!pendingHandle) return;
    try {
      const state = await pendingHandle.requestPermission({ mode: "read" });
      if (state === "granted") await loadWebHandle(pendingHandle);
      else setError("Permission was not granted. Choose the folder again to continue.");
    } catch (e) {
      setError(e.message || "Could not re-open the music folder");
    }
  }, [pendingHandle, loadWebHandle]);

  const pickDirectory = useCallback(async () => {
    setError(null);

    if (isMobile) {
      if (!Filesystem || !Preferences) {
        setError("File access is not ready yet. Try again in a moment.");
        return;
      }
      // Capacitor has no directory picker, so the public Music folder is used.
      const musicPath = "Music";
      try {
        await Filesystem.readdir({ path: musicPath, directory: "EXTERNAL" });
      } catch {
        setError("Could not access Music folder. Please ensure you have music files in your Music directory.");
        return;
      }
      await Preferences.set({ key: "musicRootPath", value: musicPath });
      await loadMobilePath(Filesystem, musicPath);
      return;
    }

    if (!("showDirectoryPicker" in window)) {
      setError("File System Access API not supported. Use Chrome/Edge on desktop.");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "read", startIn: "music" });
      await saveDirectoryHandle(handle, "Music Library");
      await loadWebHandle(handle);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Failed to select directory");
    }
  }, [isMobile, Filesystem, Preferences, loadMobilePath, loadWebHandle]);

  const removeDirectory = useCallback(async () => {
    if (isMobile) {
      await Preferences?.remove({ key: "musicRootPath" });
    } else {
      await clearDirectoryHandle();
    }
    setRootFolder(null);
    setPendingHandle(null);
    setSelectedFolderPath(null);
  }, [isMobile, Preferences]);

  const toggleFolder = useCallback((folderPath) => {
    setRootFolder((prev) => {
      if (!prev) return null;
      const update = (folder) =>
        folder.path === folderPath
          ? { ...folder, expanded: !folder.expanded }
          : { ...folder, folders: folder.folders.map(update) };
      return update(prev);
    });
  }, []);

  const selectFolder = useCallback((folderPath) => {
    setSelectedFolderPath(folderPath);
  }, []);

  // Tracks in a folder and everything below it; the root ("") returns the whole library.
  const getTracksForFolder = useCallback(
    (folderPath) => {
      if (!rootFolder) return [];
      if (folderPath === "" || folderPath === rootFolder.path) return allTracks;
      const folder = flattenFolders(rootFolder.folders).find((f) => f.path === folderPath);
      return folder ? collectFolderFiles(folder) : [];
    },
    [rootFolder, allTracks]
  );

  // Playable URL for a track: object URL on web, blob URL built from the file on mobile.
  // Callers own the result and should URL.revokeObjectURL it when done.
  const createObjectURL = useCallback(
    async (track) => {
      try {
        if (isMobile && Filesystem && track.fullPath) {
          const result = await Filesystem.readFile({
            path: track.fullPath,
            directory: "EXTERNAL",
          });
          const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
          return URL.createObjectURL(new Blob([bytes], { type: mimeFor(track.name) }));
        }
        if (track.handle) {
          return URL.createObjectURL(await track.handle.getFile());
        }
      } catch (e) {
        console.error("Failed to open local file:", e);
      }
      return null;
    },
    [isMobile, Filesystem]
  );

  return {
    rootFolder,
    loading,
    error,
    selectedFolderPath,
    allTracks,
    pickDirectory,
    removeDirectory,
    reconnect,
    toggleFolder,
    selectFolder,
    getTracksForFolder,
    createObjectURL,
    hasPermission: !!rootFolder,
    needsReconnect: !rootFolder && !!pendingHandle,
    isMobile,
  };
}
