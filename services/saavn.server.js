// Server-only. Uses the cloned JioSaavn engine to search and normalize tracks.
// Never imported by client code — the browser only ever hits our own /api/tracks route.
import { setDefaultResultOrder } from "node:dns";
import { GENRES, MusicServiceError } from "@/services/genres";
import { SearchService } from "#modules/search/services/search.service";

// Some hosts have no route to JioSaavn's IPv6 addresses; undici otherwise tries
// them first and fails the whole request with "fetch failed".
setDefaultResultOrder("ipv4first");

const searchService = new SearchService();

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// The API delivers downloadUrl entries as `{ quality, url }` or `{ quality, link }`.
function pickStreamUrl(raw) {
  const candidates = raw?.downloadUrl || raw?.downloadUrls || [];
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const bitrate = (entry) => parseInt(entry?.quality, 10) || 0;
  const best = [...candidates].sort((a, b) => bitrate(b) - bitrate(a))[0];
  return best?.url || best?.link || null;
}

function pickArtwork(raw) {
  const images = raw?.image || raw?.images || [];
  if (!Array.isArray(images) || images.length === 0) return null;
  const last = images[images.length - 1];
  return last?.url || last?.link || null;
}

function pickArtist(raw) {
  const primary = raw?.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    return primary.map((a) => a?.name).filter(Boolean).join(", ");
  }
  return raw?.primaryArtists || raw?.subtitle || "Unknown Artist";
}

function decodeEntities(text) {
  if (!text) return text;
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeTrack(raw, genreLabel) {
  const streamUrl = pickStreamUrl(raw);
  if (!streamUrl) return null;
  return {
    id: `saavn-${raw.id}`,
    title:
      decodeEntities(raw.name?.trim() || raw.title?.trim()) || "Untitled Track",
    artist: decodeEntities(pickArtist(raw)?.trim()) || "Unknown Artist",
    genre: genreLabel,
    streamUrl,
    artwork: pickArtwork(raw),
    duration: Number(raw.duration) || 0,
  };
}

export async function searchGenre(genreId, { limit = 40 } = {}) {
  const genre = GENRES.find((entry) => entry.id === genreId);
  if (!genre) {
    throw new MusicServiceError(`Unknown genre: ${genreId}`);
  }

  let data;
  try {
    data = await searchService.searchSongs({
      query: genre.query,
      page: 0,
      limit: Number(limit) || 40,
    });
  } catch (error) {
    throw new MusicServiceError(
      `Internal JioSaavn engine search failed for "${genre.label}": ${error?.message || error}`,
      { cause: error }
    );
  }

  const results = data?.results || [];

  const tracks = Array.isArray(results)
    ? results.map((raw) => normalizeTrack(raw, genre.label)).filter(Boolean)
    : [];

  if (tracks.length === 0) {
    throw new MusicServiceError(
      `No playable tracks came back for "${genre.label}".`
    );
  }

  return shuffle(tracks);
}
