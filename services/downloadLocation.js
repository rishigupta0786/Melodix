// Where finished downloads are saved. Client-side only.
//
// - Desktop Chrome/Edge: a folder the user picks once (File System Access API); files are written straight into it.
// - Android app (Capacitor): one of a few preset public folders, written through the Filesystem plugin.
// - Everything else (Firefox, Safari, phone browsers): the browser's own download behaviour, which sites cannot change.

const DB_NAME = "MusicPlayerDB"; // shared with the local-music folder handle
const STORE_NAME = "directoryHandles";
const DB_VERSION = 1;
const FOLDER_KEY = "downloadFolder";
const NATIVE_KEY = "melodix_native_download_dir";

export const NATIVE_DESTINATIONS = [
  { id: "documents", label: "Documents / Melodix", directory: "DOCUMENTS", path: "Melodix" },
  { id: "download", label: "Download / Melodix", directory: "EXTERNAL_STORAGE", path: "Download/Melodix" },
  { id: "music", label: "Music / Melodix", directory: "EXTERNAL_STORAGE", path: "Music/Melodix" },
];

export function isNativeApp() {
  return typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
}

export function supportsFolderPicker() {
  return typeof window !== "undefined" && !isNativeApp() && "showDirectoryPicker" in window;
}

function openDB() {
  return new Promise((resolve, reject) => {
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

async function readHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(FOLDER_KEY);
    request.onsuccess = () => resolve(request.result?.handle || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    if (handle) tx.objectStore(STORE_NAME).put({ id: FOLDER_KEY, handle, savedAt: Date.now() });
    else tx.objectStore(STORE_NAME).delete(FOLDER_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const listeners = new Set();
export function subscribeLocation(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const emit = () => listeners.forEach((listener) => listener());

function readNativeId() {
  try {
    return localStorage.getItem(NATIVE_KEY) || NATIVE_DESTINATIONS[0].id;
  } catch {
    return NATIVE_DESTINATIONS[0].id;
  }
}

// { kind: "folder" | "native" | "default", label }
export async function getLocation() {
  if (isNativeApp()) {
    const choice = NATIVE_DESTINATIONS.find((d) => d.id === readNativeId()) || NATIVE_DESTINATIONS[0];
    return { kind: "native", label: choice.label, id: choice.id };
  }
  if (supportsFolderPicker()) {
    try {
      const handle = await readHandle();
      if (handle) return { kind: "folder", label: handle.name };
    } catch {}
  }
  return { kind: "default", label: "Browser default (Downloads)" };
}

export async function pickFolder() {
  const handle = await window.showDirectoryPicker({
    id: "melodix-downloads",
    mode: "readwrite",
    startIn: "downloads",
  });
  await writeHandle(handle);
  emit();
  return handle;
}

export async function resetLocation() {
  await writeHandle(null);
  emit();
}

export function setNativeDestination(id) {
  try {
    localStorage.setItem(NATIVE_KEY, id);
  } catch {}
  emit();
}

// Call straight from the click that starts a download: browsers only show the
// permission prompt for a folder while the user gesture is still fresh.
// Returns what save() needs, or null to fall back to the browser's default download.
export async function prepareSave() {
  if (isNativeApp()) {
    return { kind: "native", destination: NATIVE_DESTINATIONS.find((d) => d.id === readNativeId()) };
  }
  if (!supportsFolderPicker()) return null;
  try {
    const handle = await readHandle();
    if (!handle) return null;
    let state = await handle.queryPermission({ mode: "readwrite" });
    if (state !== "granted") state = await handle.requestPermission({ mode: "readwrite" });
    return state === "granted" ? { kind: "folder", handle } : null;
  } catch {
    return null;
  }
}

const safeName = (name) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().slice(0, 150) || "song";

async function uniqueFileName(directory, base, ext) {
  for (let n = 0; ; n += 1) {
    const name = n === 0 ? `${base}.${ext}` : `${base} (${n}).${ext}`;
    try {
      await directory.getFileHandle(name);
    } catch (error) {
      if (error.name === "NotFoundError") return name;
      throw error;
    }
  }
}

function toBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function triggerBrowserDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Fetches the finished file from the server and stores it. Returns where it ended up.
export async function save({ token, title, ext, target }) {
  const url = `/api/youtube/download?${new URLSearchParams({ token, title })}`;
  const base = safeName(title);

  if (!target) {
    triggerBrowserDownload(url, `${base}.${ext}`);
    return "your Downloads folder";
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not fetch the finished file.");

  if (target.kind === "folder") {
    const name = await uniqueFileName(target.handle, base, ext);
    const file = await target.handle.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await response.body.pipeTo(writable);
    return `${target.handle.name}`;
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { destination } = target;
  const directory = Directory[destination.directory === "DOCUMENTS" ? "Documents" : "ExternalStorage"];
  await Filesystem.writeFile({
    path: `${destination.path}/${base}.${ext}`,
    data: toBase64(await response.arrayBuffer()),
    directory,
    recursive: true,
  });
  return destination.label;
}
