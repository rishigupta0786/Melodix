// Universal music service - works on Web (via API route) and Mobile (via Capacitor HTTP)
// Detects platform at runtime and uses appropriate transport

import { GENRES, MusicServiceError } from "@/services/genres";

export { GENRES, MusicServiceError } from "@/services/genres";

// JioSaavn search endpoint (unofficial)
const JIOSAAVN_SEARCH_URL = "https://www.jiosaavn.com/api.php";

// Capacitor HTTP plugin - only available on native platforms
let CapacitorHttp = null;
let isNative = false;

if (typeof window !== "undefined") {
  // Check if running in Capacitor
  isNative = !!window.Capacitor?.isNativePlatform;
  if (isNative) {
    // Dynamic import to avoid bundling issues on web
    // Http is part of @capacitor/core in v8+
    import("@capacitor/core").then((mod) => {
      CapacitorHttp = mod.Http;
    }).catch(() => {
      // Capacitor not available
    });
  }
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function normalizeTrack(raw, genreLabel) {
  const streamUrl = pickStreamUrl(raw);
  if (!streamUrl) return null;
  return {
    id: `saavn-${raw.id}`,
    title: decodeEntities(raw.name?.trim() || raw.title?.trim()) || "Untitled Track",
    artist: decodeEntities(pickArtist(raw)?.trim()) || "Unknown Artist",
    genre: genreLabel,
    streamUrl,
    artwork: pickArtwork(raw),
    duration: Number(raw.duration) || 0,
  };
}

// Build JioSaavn search request payload
function buildSearchPayload(query, page, limit) {
  // JioSaavn API expects specific parameters
  const params = new URLSearchParams({
    __call: "search.getResults",
    q: query,
    p: String(page + 1),
    n: String(limit),
    _format: "json",
    _marker: "0",
    api_version: "4",
    ctx: "web6dot0",
  });
  return params.toString();
}

// Fetch via Capacitor HTTP (native only - bypasses CORS)
async function fetchViaCapacitor(query, limit) {
  if (!CapacitorHttp) {
    throw new MusicServiceError("Capacitor HTTP plugin not available");
  }

  const body = buildSearchPayload(query, 0, limit);
  const response = await CapacitorHttp.post({
    url: JIOSAAVN_SEARCH_URL,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
    },
    data: body,
  });

  if (response.status !== 200) {
    throw new MusicServiceError(`JioSaavn API error: ${response.status}`);
  }

  return response.data;
}

// Fetch via web API route (development/production web)
async function fetchViaApiRoute(genreId) {
  const response = await fetch(`/api/tracks?genre=${encodeURIComponent(genreId)}`);
  let data = null;
  try {
    data = await response.json();
  } catch {
    // fall through
  }

  if (!response.ok) {
    throw new MusicServiceError(
      data?.error || `Music service responded with an error (${response.status}).`
    );
  }

  return Array.isArray(data?.tracks) ? data.tracks : [];
}

// Main export - automatically chooses the right transport
export async function fetchTracksForGenre(genreId, options) {
  const genre = GENRES.find((entry) => entry.id === genreId);
  if (!genre) {
    throw new MusicServiceError(`Unknown genre: ${genreId}`);
  }

  const limit = options?.limit ?? 40;

  // On native mobile: use Capacitor HTTP to call JioSaavn directly
  if (isNative && CapacitorHttp) {
    try {
      const data = await fetchViaCapacitor(genre.query, limit);
      const results = data?.results || [];
      const tracks = Array.isArray(results)
        ? results.map((raw) => normalizeTrack(raw, genre.label)).filter(Boolean)
        : [];
      if (tracks.length === 0) {
        throw new MusicServiceError(`No playable tracks for "${genre.label}".`);
      }
      return shuffle(tracks);
    } catch (error) {
      if (error instanceof MusicServiceError) throw error;
      throw new MusicServiceError(
        `JioSaavn search failed: ${error?.message || error}`,
        { cause: error }
      );
    }
  }

  // On web: use our API route proxy
  return fetchViaApiRoute(genreId);
}

// Helper to check if running on native platform
export function isNativePlatform() {
  return isNative;
}