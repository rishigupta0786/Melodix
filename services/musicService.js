// Client-facing music service. Calls our own /api/tracks proxy route rather
// than a third-party API directly (see app/api/tracks/route.js).
import { MusicServiceError } from "@/services/genres";

export { GENRES, MusicServiceError } from "@/services/genres";

export async function fetchTracksForGenre(genreId) {
  let response;
  try {
    response = await fetch(`/api/tracks?genre=${encodeURIComponent(genreId)}`);
  } catch (error) {
    throw new MusicServiceError(
      "Could not reach the music service. Check your connection.",
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
      data?.error || `Music service responded with an error (${response.status}).`
    );
  }

  return Array.isArray(data?.tracks) ? data.tracks : [];
}
