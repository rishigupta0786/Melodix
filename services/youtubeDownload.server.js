// Server-only: converts a YouTube video to an MP3 on disk using yt-dlp + ffmpeg.
// Binary is installed into ./bin by scripts/setup.mjs.

import { create } from "youtube-dl-exec";
import ffmpeg from "ffmpeg-static";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MusicServiceError } from "@/services/genres";

const YTDLP_FILENAME = os.platform() === "win32" ? "yt-dlp.exe" : "yt-dlp_linux";
const YTDLP_PATH = path.join(process.cwd(), "bin", YTDLP_FILENAME);
const READY_TTL_MS = 5 * 60 * 1000;

export const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

// Hosts we are willing to fetch direct audio from (JioSaavn CDN).
const DIRECT_AUDIO_HOSTS = /(^|\.)(saavncdn\.com|jiosaavn\.com)$/i;

const MIME_TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4", webm: "audio/webm" };
export const mimeForExt = (ext) => MIME_TYPES[ext] || "application/octet-stream";

// Finished files waiting to be fetched by the browser: token -> { filePath, ext, cleanup, timer }
const ready = new Map();

function registerReady(filePath, ext, cleanup) {
  const token = crypto.randomUUID();
  const timer = setTimeout(() => {
    ready.delete(token);
    cleanup();
  }, READY_TTL_MS);
  ready.set(token, { filePath, ext, cleanup, timer });
  return { token, ext };
}

export function isAllowedDirectAudioUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && DIRECT_AUDIO_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}

export function takeReadyDownload(token) {
  const entry = ready.get(token);
  if (!entry) return null;
  clearTimeout(entry.timer);
  ready.delete(token);
  return entry;
}

// onProgress receives a 0-100 number. Resolves with a token for takeReadyDownload().
export async function convertYouTubeAudio(videoId, onProgress) {
  if (!fs.existsSync(YTDLP_PATH)) {
    throw new MusicServiceError("yt-dlp is not installed. Run `npm install` (or `node scripts/setup.mjs`).");
  }

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "melodix-dl-"));
  const cleanup = () => fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});

  try {
    const youtubedl = create(YTDLP_PATH);
    const subprocess = youtubedl.exec(`https://www.youtube.com/watch?v=${videoId}`, {
      format: "bestaudio/best",
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,
      output: path.join(dir, "%(id)s.%(ext)s"),
      noPlaylist: true,
      noWarnings: true,
      newline: true,
      ffmpegLocation: ffmpeg,
      jsRuntimes: `node:${process.execPath}`,
    });

    // Downloading maps to 0-90%, the mp3 conversion covers the rest.
    subprocess.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      const matches = [...text.matchAll(/\[download\]\s+([\d.]+)%/g)];
      if (matches.length) onProgress?.(Math.min(90, parseFloat(matches.at(-1)[1]) * 0.9));
      if (text.includes("[ExtractAudio]")) onProgress?.(95);
    });

    await subprocess;

    const file = (await fs.promises.readdir(dir)).find((name) => name.endsWith(".mp3"));
    if (!file) throw new MusicServiceError("Download finished but no audio file was produced.");

    return registerReady(path.join(dir, file), "mp3", cleanup);
  } catch (error) {
    await cleanup();
    if (error instanceof MusicServiceError) throw error;
    const detail = String(error?.stderr || error?.message || error).split("\n").filter(Boolean).pop();
    throw new MusicServiceError(`Download failed: ${detail}`, { cause: error });
  }
}

// Streams an already-playable audio file (e.g. a JioSaavn stream URL) to disk with 0-100 progress.
export async function fetchDirectAudio(sourceUrl, onProgress) {
  if (!isAllowedDirectAudioUrl(sourceUrl)) {
    throw new MusicServiceError("This audio source is not allowed.");
  }

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "melodix-dl-"));
  const cleanup = () => fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok || !response.body) {
      throw new MusicServiceError(`Download failed (${response.status}).`);
    }

    const total = Number(response.headers.get("content-length")) || 0;
    const ext = path.extname(new URL(sourceUrl).pathname).slice(1).toLowerCase() === "mp3" ? "mp3" : "m4a";
    const filePath = path.join(dir, `song.${ext}`);

    let received = 0;
    const body = Readable.fromWeb(response.body);
    body.on("data", (chunk) => {
      received += chunk.length;
      if (total) onProgress?.(Math.min(99, (received / total) * 100));
    });
    await pipeline(body, fs.createWriteStream(filePath));

    return registerReady(filePath, ext, cleanup);
  } catch (error) {
    await cleanup();
    if (error instanceof MusicServiceError) throw error;
    throw new MusicServiceError(`Download failed: ${error?.message || error}`, { cause: error });
  }
}
