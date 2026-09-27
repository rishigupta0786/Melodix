"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { GENRES, fetchTracksForGenre } from "@/services/musicService.mobile";

const initialQueueState = {
  tracks: [],
  currentTrackIndex: 0,
  resolvedGenre: null,
  error: null,
};

function queueReducer(state, action) {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return {
        tracks: action.tracks,
        currentTrackIndex: 0,
        resolvedGenre: action.genre,
        error: null,
      };
    case "FETCH_ERROR":
      return {
        tracks: [],
        currentTrackIndex: 0,
        resolvedGenre: action.genre,
        error: action.message,
      };
    case "NEXT": {
      if (state.tracks.length === 0) return state;
      return {
        ...state,
        currentTrackIndex: (state.currentTrackIndex + 1) % state.tracks.length,
      };
    }
    case "PREVIOUS": {
      if (state.tracks.length === 0) return state;
      return {
        ...state,
        currentTrackIndex:
          (state.currentTrackIndex - 1 + state.tracks.length) % state.tracks.length,
      };
    }
    case "REMOVE_CURRENT": {
      if (state.tracks.length === 0) return state;
      const nextTracks = state.tracks.filter((_, i) => i !== state.currentTrackIndex);
      if (nextTracks.length === 0) {
        return { ...state, tracks: [], currentTrackIndex: 0 };
      }
      return {
        ...state,
        tracks: nextTracks,
        currentTrackIndex: state.currentTrackIndex % nextTracks.length,
      };
    }
    default:
      return state;
  }
}

// `resolvedGenre` tracks which genre the current queue/error reflects. Loading
// state is derived by comparing it to `selectedGenre` rather than tracked with
// its own setState call, so the fetch effect only ever updates state from
// inside the fetch promise's own callbacks.
export function useMusicQueue(initialGenreId = GENRES[0].id) {
  const [selectedGenre, setSelectedGenre] = useState(initialGenreId);
  const [queue, dispatch] = useReducer(queueReducer, initialQueueState);

  useEffect(() => {
    let cancelled = false;

    fetchTracksForGenre(selectedGenre)
      .then((tracks) => {
        if (cancelled) return;
        dispatch({ type: "FETCH_SUCCESS", genre: selectedGenre, tracks });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({
          type: "FETCH_ERROR",
          genre: selectedGenre,
          message: err?.message || "Something went wrong loading tracks.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

  const selectGenre = useCallback((genreId) => {
    setSelectedGenre((current) => (current === genreId ? current : genreId));
  }, []);

  const goToNext = useCallback(() => dispatch({ type: "NEXT" }), []);
  const goToPrevious = useCallback(() => dispatch({ type: "PREVIOUS" }), []);
  const dropCurrentTrack = useCallback(() => dispatch({ type: "REMOVE_CURRENT" }), []);

  const isLoading = queue.resolvedGenre !== selectedGenre;

  return {
    genres: GENRES,
    selectedGenre,
    selectGenre,
    tracks: queue.tracks,
    currentTrackIndex: queue.currentTrackIndex,
    currentTrack: queue.tracks[queue.currentTrackIndex] || null,
    isLoading,
    error: isLoading ? null : queue.error,
    goToNext,
    goToPrevious,
    dropCurrentTrack,
  };
}
