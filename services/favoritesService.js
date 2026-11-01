// Favorites service for managing YouTube favorites in localStorage.
// This is Phase 1 - web only, using localStorage.

const FAVORITES_STORAGE_KEY = "music_favorites";

const EMPTY_FAVORITES = [];
const listeners = new Set();
// Cached so getSnapshot() returns a stable reference until favorites change.
let snapshot = null;

function getFavoritesFromStorage() {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  if (snapshot) return snapshot;
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    snapshot = stored ? JSON.parse(stored) : EMPTY_FAVORITES;
  } catch {
    snapshot = EMPTY_FAVORITES;
  }
  return snapshot;
}

function emitChange() {
  snapshot = null;
  listeners.forEach((listener) => listener());
}

// Lets every useFavorites() consumer re-render when favorites change anywhere
// (including other tabs, via the storage event).
export function subscribeFavorites(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === FAVORITES_STORAGE_KEY) emitChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getFavoritesServerSnapshot() {
  return EMPTY_FAVORITES;
}

function saveFavoritesToStorage(favorites) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to save favorites:", error);
  }
  emitChange();
}

export function getFavorites() {
  return getFavoritesFromStorage();
}

export function addFavorite(track) {
  const favorites = getFavoritesFromStorage();
  const exists = favorites.some((f) => f.id === track.id);
  if (!exists) {
    const newFavorite = {
      ...track,
      addedAt: new Date().toISOString(),
    };
    saveFavoritesToStorage([newFavorite, ...favorites]);
    return true;
  }
  return false;
}

export function removeFavorite(trackId) {
  const favorites = getFavoritesFromStorage();
  const filtered = favorites.filter((f) => f.id !== trackId);
  if (filtered.length !== favorites.length) {
    saveFavoritesToStorage(filtered);
    return true;
  }
  return false;
}

export function isFavorite(trackId) {
  const favorites = getFavoritesFromStorage();
  return favorites.some((f) => f.id === trackId);
}

export function toggleFavorite(track) {
  if (isFavorite(track.id)) {
    removeFavorite(track.id);
    return false;
  } else {
    addFavorite(track);
    return true;
  }
}