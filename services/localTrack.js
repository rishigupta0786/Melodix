// Helpers for local (on-device) tracks shared by the Local section, favorites and the player.

const stripExtension = (name) => name.replace(/\.[^.]+$/, "");

// Folder a file lives in, e.g. "/Bollywood/2020/song.mp3" -> "Bollywood/2020"
export function folderOf(path) {
  return path.split("/").filter(Boolean).slice(0, -1).join("/");
}

// Track shape used by favorites and the player. Playable URL (streamUrl) is attached when played.
export function toLocalTrack(file) {
  return {
    id: `local-${file.path}`,
    provider: "local",
    title: stripExtension(file.name),
    artist: folderOf(file.path) || "Local Music",
    path: file.path,
    name: file.name,
  };
}

// Blob URLs and file handles are session-only, so only identifying fields are saved to favorites.
export function toStoredLocalTrack(track) {
  const { id, provider, title, artist, path, name } = track;
  return { id, provider, title, artist, path, name };
}
