// Favorites service for managing YouTube favorites in localStorage.
// This is Phase 1 - web only, using localStorage.

const FAVORITES_STORAGE_KEY = "music_favorites";

function getFavoritesFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavoritesToStorage(favorites) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to save favorites:", error);
  }
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