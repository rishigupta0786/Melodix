"use client";

import { useCallback, useState } from "react";
import { getFavorites, addFavorite, removeFavorite, isFavorite, toggleFavorite } from "@/services/favoritesService";

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => getFavorites());

  const refresh = useCallback(() => {
    setFavorites(getFavorites());
  }, []);

  const add = useCallback((track) => {
    const added = addFavorite(track);
    if (added) refresh();
    return added;
  }, [refresh]);

  const remove = useCallback((trackId) => {
    const removed = removeFavorite(trackId);
    if (removed) refresh();
    return removed;
  }, [refresh]);

  const check = useCallback((trackId) => {
    return isFavorite(trackId);
  }, []);

  const toggle = useCallback((track) => {
    const isNowFavorite = toggleFavorite(track);
    refresh();
    return isNowFavorite;
  }, [refresh]);

  return {
    favorites,
    add,
    remove,
    isFavorite: check,
    toggle,
    refresh,
  };
}