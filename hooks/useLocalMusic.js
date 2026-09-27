"use client";

import { useCallback, useEffect, useState } from "react";

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

function flattenFolders(folders, parentPath = "") {
  const result = [];
  for (const folder of folders) {
    result.push(folder);
    if (folder.folders.length > 0) {
      result.push(...flattenFolders(folder.folders, folder.path));
    }
  }
  return result;
}

export function useLocalMusic() {
  const [rootFolder, setRootFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState(null);
  const [allTracks, setAllTracks] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [Filesystem, setFilesystem] = useState(null);
  
  // Detect platform on mount
  useEffect(() => {
    const checkPlatform = async () => {
      const mobile = typeof window !== "undefined" && window.Capacitor?.isNativePlatform;
      setIsMobile(mobile);
      
      if (mobile) {
        try {
          const mod = await import("@capacitor/filesystem");
          setFilesystem(mod.Filesystem);
        } catch (e) {
          console.warn("Capacitor Filesystem not available:", e);
        }
      }
    };
    checkPlatform();
  }, []);
  
  // Load saved directory on mount
  useEffect(() => {
    const init = async () => {
      if (isMobile && Filesystem) {
        // Mobile: load from stored path
        try {
          const { getString } = await import("@capacitor/preferences");
          const { value } = await getString({ key: "musicRootPath" });
          if (value) {
            setLoading(true);
            const result = await scanDirectoryCapacitor(Filesystem, value, "");
            setRootFolder({
              name: "Music Library",
              path: "",
              fullPath: value,
              folders: result.folders,
              files: result.files,
              expanded: true,
            });
            const allFiles = [];
            function collectFiles(folders) {
              for (const f of folders) {
                allFiles.push(...f.files);
                if (f.folders.length > 0) collectFiles(f.folders);
              }
            }
            collectFiles(result.folders);
            allFiles.push(...result.files);
            setAllTracks(allFiles);
            setLoading(false);
          }
        } catch (e) {
          console.error("Failed to load mobile directory:", e);
        }
      } else {
        // Web: load from IndexedDB
        try {
          const handle = await getDirectoryHandle();
          if (handle) {
            setLoading(true);
            const result = await scanDirectoryRecursive(handle);
            setRootFolder({
              name: "Music Library",
              path: "",
              handle,
              folders: result.folders,
              files: result.files,
              expanded: true,
            });
            const allFiles = [];
            function collectFiles(folders) {
              for (const f of folders) {
                allFiles.push(...f.files);
                if (f.folders.length > 0) collectFiles(f.folders);
              }
            }
            collectFiles(result.folders);
            allFiles.push(...result.files);
            setAllTracks(allFiles);
            setLoading(false);
          }
        } catch (e) {
          console.error("Failed to load web directory:", e);
        }
      }
    };
    init();
  }, [isMobile, Filesystem]);
  
  const pickDirectory = useCallback(async () => {
    if (isMobile && Filesystem) {
      // Mobile: Use Capacitor file picker or directory picker
      try {
        setLoading(true);
        setError(null);
        
        // Try to use a directory picker approach
        // For now, we'll use a simple approach - let user pick a file to determine the folder
        // In a real app, you'd use a proper directory picker plugin
        const { Filesystem: FS } = await import("@capacitor/filesystem");
        const { Preferences } = await import("@capacitor/preferences");
        
        // For mobile, we'll ask user to pick a file from their music folder
        // Then use that folder as the root
        // Note: Capacitor doesn't have a built-in directory picker yet
        // We'll use the Music directory as default
        const musicPath = "Music"; // This is the public Music folder on Android
        
        // Check if it exists and has files
        try {
          await FS.readdir({ path: musicPath, directory: "EXTERNAL" });
        } catch (e) {
          setError("Could not access Music folder. Please ensure you have music files in your Music directory.");
          setLoading(false);
          return;
        }
        
        await Preferences.set({ key: "musicRootPath", value: musicPath });
        
        const result = await scanDirectoryCapacitor(FS, musicPath, "");
        setRootFolder({
          name: "Music Library",
          path: "",
          fullPath: musicPath,
          folders: result.folders,
          files: result.files,
          expanded: true,
        });
        
        const allFiles = [];
        function collectFiles(folders) {
          for (const f of folders) {
            allFiles.push(...f.files);
            if (f.folders.length > 0) collectFiles(f.folders);
          }
        }
        collectFiles(result.folders);
        allFiles.push(...result.files);
        setAllTracks(allFiles);
        
        setLoading(false);
      } catch (e) {
        setError(e.message || "Failed to access music folder");
        setLoading(false);
      }
    } else {
      // Web: File System Access API
      if (!("showDirectoryPicker" in window)) {
        setError("File System Access API not supported. Use Chrome/Edge on desktop.");
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const handle = await window.showDirectoryPicker({
          mode: "read",
          startIn: "music",
        });
        
        await saveDirectoryHandle(handle, "Music Library");
        
        const result = await scanDirectoryRecursive(handle);
        setRootFolder({
          name: "Music Library",
          path: "",
          handle,
          folders: result.folders,
          files: result.files,
          expanded: true,
        });
        
        const allFiles = [];
        function collectFiles(folders) {
          for (const f of folders) {
            allFiles.push(...f.files);
            if (f.folders.length > 0) collectFiles(f.folders);
          }
        }
        collectFiles(result.folders);
        allFiles.push(...result.files);
        setAllTracks(allFiles);
        
        setLoading(false);
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(e.message || "Failed to select directory");
        }
        setLoading(false);
      }
    }
  }, [isMobile, Filesystem]);
  
  const removeDirectory = useCallback(async () => {
    if (isMobile) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key: "musicRootPath" });
    } else {
      await clearDirectoryHandle();
    }
    setRootFolder(null);
    setAllTracks([]);
    setSelectedFolderPath(null);
  }, [isMobile]);
  
  const toggleFolder = useCallback((folderPath) => {
    setRootFolder((prev) => {
      if (!prev) return null;
      const updateFolder = (folder) => {
        if (folder.path === folderPath) {
          return { ...folder, expanded: !folder.expanded };
        }
        return {
          ...folder,
          folders: folder.folders.map(updateFolder),
        };
      };
      return updateFolder(prev);
    });
  }, []);
  
  const selectFolder = useCallback((folderPath) => {
    setSelectedFolderPath(folderPath);
  }, []);
  
  const getTracksForFolder = useCallback((folderPath) => {
    if (!rootFolder) return [];
    if (folderPath === "" || folderPath === rootFolder.path) {
      return rootFolder.files;
    }
    const folder = flattenFolders(rootFolder.folders).find((f) => f.path === folderPath);
    return folder?.files || [];
  }, [rootFolder]);
  
  const getAllTracks = useCallback(() => {
    return allTracks;
  }, [allTracks]);
  
  // Create object URL for a file (web) or get file URI (mobile)
  const createObjectURL = useCallback(async (track) => {
    if (isMobile && Filesystem && track.fullPath) {
      // On mobile, read file as base64 and create blob URL
      try {
        const result = await Filesystem.readFile({
          path: track.fullPath,
          directory: "EXTERNAL",
          encoding: "base64",
        });
        // Convert base64 to blob URL
        const byteString = atob(result.data);
        const mimeType = track.name.toLowerCase().endsWith(".mp3") ? "audio/mpeg" :
                         track.name.toLowerCase().endsWith(".m4a") ? "audio/mp4" :
                         track.name.toLowerCase().endsWith(".aac") ? "audio/aac" :
                         track.name.toLowerCase().endsWith(".flac") ? "audio/flac" :
                         track.name.toLowerCase().endsWith(".ogg") ? "audio/ogg" :
                         track.name.toLowerCase().endsWith(".wav") ? "audio/wav" :
                         "audio/mpeg";
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: mimeType });
        return URL.createObjectURL(blob);
      } catch (e) {
        console.error("Failed to read mobile file:", e);
        return null;
      }
    } else if (track.handle) {
      const file = await track.handle.getFile();
      return URL.createObjectURL(file);
    }
    return null;
  }, [isMobile, Filesystem]);
  
  // Get track metadata
  const getTrackMetadata = useCallback(async (track) => {
    const url = await createObjectURL(track);
    if (!url) return { duration: 0, title: track.name.replace(/\.[^.]+$/, ""), artist: "Unknown Artist" };
    
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        if (!isMobile) URL.revokeObjectURL(url);
        resolve({
          duration: audio.duration,
          title: track.name.replace(/\.[^.]+$/, ""),
          artist: "Unknown Artist",
        });
      };
      audio.onerror = () => {
        if (!isMobile) URL.revokeObjectURL(url);
        resolve({
          duration: 0,
          title: track.name.replace(/\.[^.]+$/, ""),
          artist: "Unknown Artist",
        });
      };
      audio.src = url;
    });
  }, [createObjectURL, isMobile]);
  
  return {
    rootFolder,
    loading,
    error,
    selectedFolderPath,
    allTracks,
    pickDirectory,
    removeDirectory,
    toggleFolder,
    selectFolder,
    getTracksForFolder,
    getAllTracks,
    createObjectURL,
    getTrackMetadata,
    hasPermission: !!rootFolder,
    isMobile,
  };
}