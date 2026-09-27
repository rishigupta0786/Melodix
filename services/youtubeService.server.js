// Server-only YouTube Data API v3 integration.
// Never imported by client code — the browser only ever hits our own /api/youtube/search route.

import { MusicServiceError } from "@/services/genres";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

if (!YOUTUBE_API_KEY) {
  console.warn("[youtubeService.server] YOUTUBE_API_KEY is not set. YouTube search will fail.");
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

function normalizeYouTubeItem(item) {
  const videoId = item.id?.videoId;
  const snippet = item.snippet;

  if (!videoId || !snippet) return null;

  return {
    id: `youtube-${videoId}`,
    provider: "youtube",
    title: decodeEntities(snippet.title?.trim()) || "Untitled Video",
    artist: decodeEntities(snippet.channelTitle?.trim()) || "Unknown Channel",
    genre: "YouTube Search",
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null,
    publishedAt: snippet.publishedAt,
    youtubeVideoId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    duration: 0, // Duration requires a separate API call; we'll leave as 0 for now
  };
}

export async function searchYouTube(query, { limit = 20 } = {}) {
  if (!YOUTUBE_API_KEY) {
    throw new MusicServiceError("YouTube API key is not configured on the server.");
  }

  if (!query?.trim()) {
    throw new MusicServiceError("Search query cannot be empty.");
  }

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query.trim(),
    type: "video",
    maxResults: String(Math.min(limit, 50)),
    videoEmbeddable: "true",
    videoSyndicated: "true",
    key: YOUTUBE_API_KEY,
  });

  const searchUrl = `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`;

  let data;
  try {
    const response = await fetch(searchUrl);
    data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `YouTube API error (${response.status})`;
      if (response.status === 403 && errorMessage.includes("quota")) {
        throw new MusicServiceError("YouTube API quota exceeded. Please try again later.");
      }
      if (response.status === 400 && errorMessage.includes("key")) {
        throw new MusicServiceError("Invalid YouTube API key.");
      }
      throw new MusicServiceError(`YouTube search failed: ${errorMessage}`);
    }
  } catch (error) {
    if (error instanceof MusicServiceError) throw error;
    throw new MusicServiceError(`Network error during YouTube search: ${error?.message || error}`, { cause: error });
  }

  const items = data?.items || [];
  const tracks = items
    .map(normalizeYouTubeItem)
    .filter(Boolean);

  if (tracks.length === 0) {
    throw new MusicServiceError(`No results found for "${query}".`);
  }

  return tracks;
}