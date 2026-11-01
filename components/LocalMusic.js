"use client";

import { useMemo, useState } from "react";
import { flattenFolders } from "@/hooks/useLocalMusic";
import { useFavorites } from "@/hooks/useFavorites";
import { folderOf, toLocalTrack, toStoredLocalTrack } from "@/services/localTrack";

const FOLDER_ICON = "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z";
const NOTE_ICON = "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z";
const HEART_ICON =
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {[0, 0.25, 0.5].map((delay) => (
        <span
          key={delay}
          className="eq-bar w-1 rounded-full bg-accent"
          style={{ height: "100%", animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

function FolderTreeItem({ folder, level = 0, selectedPath, onToggle, onSelect }) {
  const hasChildren = folder.folders.length > 0;
  const isSelected = selectedPath === folder.path;
  const count = useMemo(() => countFiles(folder), [folder]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(folder.path)}
        className={`focus-ring flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-left text-sm transition-colors ${
          isSelected
            ? "bg-accent/20 text-text-primary"
            : "text-zinc-300 hover:bg-white/10 hover:text-text-primary"
        }`}
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={folder.expanded ? "Collapse folder" : "Expand folder"}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(folder.path);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-transform hover:bg-white/10"
            style={{ transform: folder.expanded ? "rotate(90deg)" : "none" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
            </svg>
          </span>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" aria-hidden="true">
          <path d={FOLDER_ICON} fill="currentColor" />
        </svg>
        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        <span className="text-xs tabular-nums text-text-secondary">{count}</span>
      </button>

      {folder.expanded &&
        folder.folders.map((sub) => (
          <FolderTreeItem
            key={sub.path}
            folder={sub}
            level={level + 1}
            selectedPath={selectedPath}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function countFiles(folder) {
  return folder.files.length + folder.folders.reduce((sum, f) => sum + countFiles(f), 0);
}

function TrackRow({ file, isCurrent, isPlaying, onPlay }) {
  const { isFavorite, toggle } = useFavorites();
  const track = toLocalTrack(file);
  const favorite = isFavorite(track.id);

  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        isCurrent ? "bg-accent/15" : "hover:bg-white/10"
      }`}
    >
      <button
        type="button"
        onClick={() => onPlay(file)}
        aria-label={`Play ${track.title}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            isCurrent ? "bg-accent/25 text-accent" : "bg-white/5 text-text-secondary"
          }`}
        >
          {isCurrent && isPlaying ? (
            <Equalizer />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d={NOTE_ICON} fill="currentColor" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium ${isCurrent ? "text-accent-strong" : "text-text-primary"}`}
          >
            {track.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">{track.artist}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => toggle(toStoredLocalTrack(track))}
        aria-label={favorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
        aria-pressed={favorite}
        className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          favorite ? "text-accent" : "text-text-secondary hover:bg-white/10 hover:text-accent"
        }`}
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} aria-hidden="true">
          <path d={HEART_ICON} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}

function EmptyState({ title, children, action, error }) {
  return (
    <div className="glass-panel flex min-h-[18rem] flex-col items-center justify-center rounded-3xl px-6 py-8 text-center">
      <svg viewBox="0 0 24 24" className="mb-4 h-14 w-14 text-accent" aria-hidden="true">
        <path d={NOTE_ICON} fill="currentColor" />
      </svg>
      <h2 className="mb-2 text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mb-6 max-w-md text-sm text-text-secondary">{children}</p>
      {action}
      {error && <p className="mt-4 max-w-md text-sm text-red-400">{error}</p>}
    </div>
  );
}

const primaryButton =
  "focus-ring flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-medium text-[#0a0a0d] transition-colors hover:bg-accent-strong disabled:opacity-50";

export default function LocalMusic({ library, currentTrackId, isPlaying, onPlayTrack }) {
  const {
    rootFolder,
    loading,
    error,
    selectedFolderPath,
    allTracks,
    pickDirectory,
    reconnect,
    toggleFolder,
    selectFolder,
    getTracksForFolder,
    hasPermission,
    needsReconnect,
    isMobile,
  } = library;

  const [query, setQuery] = useState("");
  const activePath = selectedFolderPath ?? "";

  const folders = useMemo(() => (rootFolder ? flattenFolders(rootFolder.folders) : []), [rootFolder]);

  const visibleTracks = useMemo(() => {
    const scope = getTracksForFolder(activePath);
    const needle = query.trim().toLowerCase();
    if (!needle) return scope;
    return scope.filter((file) => `${file.name} ${folderOf(file.path)}`.toLowerCase().includes(needle));
  }, [getTracksForFolder, activePath, query]);

  if (!hasPermission) {
    if (loading) {
      return (
        <EmptyState title="Scanning your music…">This can take a moment for large libraries.</EmptyState>
      );
    }
    if (needsReconnect) {
      return (
        <EmptyState
          title="Welcome back"
          error={error}
          action={
            <div className="flex flex-col items-center gap-3">
              <button type="button" onClick={reconnect} className={primaryButton}>
                Reconnect music folder
              </button>
              <button
                type="button"
                onClick={pickDirectory}
                className="focus-ring text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
              >
                Choose a different folder
              </button>
            </div>
          }
        >
          Your browser needs permission again to read your music folder. Your files never leave this device.
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title="Select Your Music Folder"
        error={error}
        action={
          <button type="button" onClick={pickDirectory} className={primaryButton}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d={FOLDER_ICON} fill="currentColor" />
            </svg>
            {isMobile ? "Scan Music Folder" : "Choose Music Folder"}
          </button>
        }
      >
        {isMobile
          ? "The app will scan your Music folder for audio files. Make sure you have music files in your device's Music directory."
          : "Choose a folder containing your music files. The app will scan it and all subfolders for audio files."}
        {!isMobile && (
          <span className="mt-3 block text-xs text-text-secondary">Requires Chrome or Edge.</span>
        )}
      </EmptyState>
    );
  }

  const heading = activePath === "" ? "All Tracks" : folders.find((f) => f.path === activePath)?.name;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text-primary">Local Music</h2>
          <p className="text-xs text-text-secondary">
            {allTracks.length} track{allTracks.length !== 1 ? "s" : ""} · {folders.length} folder
            {folders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={pickDirectory}
          disabled={loading}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d={FOLDER_ICON} fill="currentColor" />
          </svg>
          {loading ? "Scanning…" : "Change Folder"}
        </button>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your music…"
          aria-label="Search local music"
          className="focus-ring glass-panel w-full rounded-xl py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary"
        />
      </div>

      {/* Mobile: folders as scrollable chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden" role="tablist" aria-label="Folders">
        {[{ path: "", name: "All", count: allTracks.length }, ...folders.map((f) => ({
          path: f.path,
          name: f.name,
          count: countFiles(f),
        }))].map((chip) => (
          <button
            key={chip.path || "all"}
            type="button"
            role="tab"
            aria-selected={activePath === chip.path}
            onClick={() => selectFolder(chip.path)}
            className={`focus-ring shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
              activePath === chip.path
                ? "bg-accent text-[#0a0a0d] font-medium"
                : "glass-panel text-zinc-300 hover:text-text-primary"
            }`}
          >
            {chip.name} <span className="opacity-70">{chip.count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-start gap-4">
        {/* Desktop: folder tree */}
        <aside className="glass-panel hidden max-h-[60vh] w-64 shrink-0 overflow-y-auto rounded-2xl p-2 lg:block">
          <button
            type="button"
            onClick={() => selectFolder("")}
            className={`focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              activePath === "" ? "bg-accent/20 text-text-primary" : "text-zinc-300 hover:bg-white/10"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" aria-hidden="true">
              <path d={NOTE_ICON} fill="currentColor" />
            </svg>
            <span className="flex-1">All Tracks</span>
            <span className="text-xs tabular-nums text-text-secondary">{allTracks.length}</span>
          </button>
          {rootFolder.folders.map((folder) => (
            <FolderTreeItem
              key={folder.path}
              folder={folder}
              selectedPath={activePath}
              onToggle={toggleFolder}
              onSelect={selectFolder}
            />
          ))}
        </aside>

        <section className="glass-panel min-w-0 flex-1 overflow-hidden rounded-2xl" aria-label={heading}>
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="truncate text-sm font-medium text-text-primary">{heading}</h3>
            <p className="text-xs text-text-secondary">
              {visibleTracks.length} track{visibleTracks.length !== 1 ? "s" : ""}
              {query.trim() ? " found" : ""}
            </p>
          </div>
          {visibleTracks.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-text-secondary">
              {query.trim() ? "No songs match your search." : "No audio files in this folder."}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 p-2" role="list">
              {visibleTracks.map((file) => (
                <TrackRow
                  key={file.path}
                  file={file}
                  isCurrent={currentTrackId === `local-${file.path}`}
                  isPlaying={isPlaying}
                  onPlay={(f) => onPlayTrack(f, visibleTracks)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
