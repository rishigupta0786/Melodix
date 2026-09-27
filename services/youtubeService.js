// Client-facing YouTube service. Calls our own /api/youtube/search proxy route.
import { MusicServiceError } from "@/services/genres";

export async function searchYouTube(query, { limit = 20 } = {}) {
  let response;
  try {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set("limit", String(limit));
    response = await fetch(`/api/youtube/search?${params.toString()}`);
  } catch (error) {
    throw new MusicServiceError(
      "Could not reach the YouTube search service. Check your connection.",
      { cause: error }
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok) {
    throw new MusicServiceError(
      data?.error || `YouTube search service responded with an error (${response.status}).`
    );
  }

  return Array.isArray(data?.results) ? data.results : [];
}