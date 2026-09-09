import { MusicServiceError } from "@/services/genres";
import { searchGenre } from "@/services/saavn.server";

// Proxies the unofficial JioSaavn API so the browser never calls it directly
// (avoids CORS and keeps the third-party endpoint server-side).
export async function GET(request) {
  const genre = new URL(request.url).searchParams.get("genre");
  if (!genre) {
    return Response.json({ error: "Missing ?genre parameter." }, { status: 400 });
  }

  try {
    const tracks = await searchGenre(genre);
    return Response.json({ tracks });
  } catch (error) {
    const status = error instanceof MusicServiceError ? 502 : 500;
    console.error("[/api/tracks]", error);
    return Response.json(
      { error: error?.message || "Failed to load tracks." },
      { status }
    );
  }
}
