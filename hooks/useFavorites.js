"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getFavorites,
  getFavoritesServerSnapshot,
  subscribeFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  toggleFavorite,
} from "@/services/favoritesService";

// Backed by a shared store, so every component using this hook (the page's
// Favorites list and each card's heart button) sees the same, live list.
export function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavorites,
    getFavoritesServerSnapshot
  );

  const add = useCallback((track) => addFavorite(track), []);
  const remove = useCallback((trackId) => removeFavorite(trackId), []);
  const check = useCallback((trackId) => isFavorite(trackId), []);
  const toggle = useCallback((track) => toggleFavorite(track), []);

  return {
    favorites,
    add,
    remove,
    isFavorite: check,
    toggle,
  };
}
