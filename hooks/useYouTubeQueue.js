"use client";

import { useCallback, useReducer, useState } from "react";

const initialQueueState = {
  tracks: [],
  currentTrackIndex: 0,
  source: null, // 'search' | 'favorites'
  error: null,
};

function queueReducer(state, action) {
  switch (action.type) {
    case "SET_TRACKS": {
      return {
        ...state,
        tracks: action.tracks,
        currentTrackIndex: action.startIndex ?? 0,
        source: action.source,
        error: null,
      };
    }
    case "SET_CURRENT_INDEX": {
      return {
        ...state,
        currentTrackIndex: action.index,
      };
    }
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
    case "CLEAR": {
      return initialQueueState;
    }
    case "SET_ERROR": {
      return {
        ...state,
        error: action.message,
      };
    }
    default:
      return state;
  }
}

export function useYouTubeQueue() {
  const [queue, dispatch] = useReducer(queueReducer, initialQueueState);

  const setTracks = useCallback((tracks, source, startIndex = 0) => {
    dispatch({ type: "SET_TRACKS", tracks, source, startIndex });
  }, []);

  const setCurrentIndex = useCallback((index) => {
    dispatch({ type: "SET_CURRENT_INDEX", index });
  }, []);

  const goToNext = useCallback(() => dispatch({ type: "NEXT" }), []);
  const goToPrevious = useCallback(() => dispatch({ type: "PREVIOUS" }), []);
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const currentTrack = queue.tracks[queue.currentTrackIndex] || null;

  return {
    tracks: queue.tracks,
    currentTrackIndex: queue.currentTrackIndex,
    currentTrack,
    source: queue.source,
    error: queue.error,
    setTracks,
    setCurrentIndex,
    goToNext,
    goToPrevious,
    clear,
    isEmpty: queue.tracks.length === 0,
  };
}