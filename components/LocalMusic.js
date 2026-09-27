"use client";

import { useState } from "react";
import { useLocalMusic } from "@/hooks/useLocalMusic";

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function FolderItem({ 
  folder, 
  level = 0, 
  selectedPath, 
  onToggle, 
  onSelect, 
  trackCount 
}) {
  const hasChildren = folder.folders.length > 0;
  const isExpanded = folder.expanded;
  const isSelected = selectedPath === folder.path;
  const indent = level * 16;
  
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(folder.path)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(folder.path);
          }
        }}
        className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-lg transition-colors ${
          isSelected ? "bg-white/10 text-text-primary" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
        }`}
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {hasChildren && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(folder.path);
            }}
            className="flex shrink-0 items-center justify-center h-6 w-6 text-xs transition-transform"
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
            </svg>
          </span>
        )}
        {!hasChildren && <span className="flex shrink-0 h-6 w-6" />}
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true">
          <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" fill="currentColor" />
        </svg>
        <span className="truncate font-medium">{folder.name}</span>
        <span className="ml-auto text-xs text-text-tertiary">
          {trackCount} track{trackCount !== 1 ? "s" : ""}
        </span>
      </button>
      
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {folder.folders.map((subFolder) => (
            <FolderItem
              key={subFolder.path}
              folder={subFolder}
              level={level + 1}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
              trackCount={subFolder.files.length + subFolder.folders.reduce((a, b) => a + b.files.length, 0)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackList({ tracks, onPlay, currentTrackId, isPlaying }) {
  if (tracks.length === 0) {
    return (
      <div className="flex min-h-[5rem] items-center justify-center text-center px-4">
        <p className="text-sm text-text-secondary">No audio files in this folder</p>
      </div>
    );
  }
  
  return (
    <ul className="flex flex-col gap-1" role="list">
      {tracks.map((track) => (
        <li key={track.path} className="glass-panel flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/10">
          <button
            type="button"
            onClick={() => onPlay(track)}
            className="focus-ring flex shrink-0 items-center justify-center h-9 w-9 rounded-full text-text-primary hover:bg-white/10 hover:text-accent transition-colors"
            aria-label={`Play ${track.name}`}
          >
            {currentTrackId === track.path && isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <polygon points="7,4 20,12 7,20" fill="currentColor" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-medium text-text-primary">
              {track.name.replace(/\.[^.]+$/, "")}
            </h3>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function LocalMusic({ onPlayTrack }) {
  const {
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
    hasPermission,
    isMobile,
  } = useLocalMusic();
  
  const [showPicker, setShowPicker] = useState(false);
  
  const tracksInSelectedFolder = selectedFolderPath !== null 
    ? getTracksForFolder(selectedFolderPath)
    : [];
  
  if (!hasPermission) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center min-h-[20rem] rounded-3xl px-6 py-8 text-center">
        <svg viewBox="0 0 24 24" className="h-16 w-16 text-text-tertiary mb-4" aria-hidden="true">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor" />
        </svg>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Select Your Music Folder</h2>
        <p className="text-sm text-text-secondary mb-6 max-w-md">
          {isMobile 
            ? "The app will scan your Music folder for audio files. Make sure you have music files in your device's Music directory."
            : "Choose a folder containing your music files. The app will scan it and all subfolders for audio files."
          }
        </p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          disabled={loading}
          className="focus-ring flex items-center gap-2 rounded-xl px-6 py-3 bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" fill="currentColor" />
          </svg>
          {loading ? "Scanning..." : isMobile ? "Scan Music Folder" : "Choose Music Folder"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
        {!isMobile && (
          <p className="mt-4 text-xs text-text-tertiary">
            Requires Chrome/Edge (File System Access API)
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" aria-hidden="true">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor" />
          </svg>
          <span className="font-medium text-text-primary">Local Music</span>
          <span className="text-xs text-text-tertiary">({allTracks.length} tracks)</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="focus-ring flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" fill="currentColor" />
          </svg>
          Change Folder
        </button>
      </div>
      
      {/* Folder Tree + Track List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder Tree Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-border overflow-y-auto bg-white/5">
          <div className="p-2">
            <FolderItem
              folder={{
                ...rootFolder,
                name: "📁 " + rootFolder.name,
              }}
              level={0}
              selectedPath={selectedFolderPath}
              onToggle={toggleFolder}
              onSelect={selectFolder}
              trackCount={allTracks.length}
            />
          </div>
        </div>
        
        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedFolderPath === null ? (
            <div className="glass-panel flex flex-col items-center justify-center min-h-[20rem] rounded-3xl px-6 py-8 text-center">
              <svg viewBox="0 0 24 24" className="h-16 w-16 text-text-tertiary mb-4" aria-hidden="true">
                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" fill="currentColor" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary mb-1">Select a Folder</h3>
              <p className="text-sm text-text-secondary">Click a folder on the left to view its tracks</p>
            </div>
          ) : (
            <div className="glass-panel flex flex-col rounded-3xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-white/5">
                <h3 className="font-medium text-text-primary truncate">
                  {selectedFolderPath === "" ? "All Tracks" : selectedFolderPath.split("/").pop()}
                </h3>
                <p className="text-xs text-text-tertiary">{tracksInSelectedFolder.length} track{tracksInSelectedFolder.length !== 1 ? "s" : ""}</p>
              </div>
              <TrackList
                tracks={tracksInSelectedFolder}
                onPlay={(track) => onPlayTrack?.(track)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}