import { MusicServiceError } from "@/services/genres";
import { searchYouTube } from "@/services/youtubeService.server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return Response.json({ error: "Missing ?q parameter." }, { status: 400 });
  }

  const limit = searchParams.get("limit");
  const limitNum = limit ? Number(limit) : 20;

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    return Response.json({ error: "Invalid limit parameter (1-50)." }, { status: 400 });
  }

  try {
    const results = await searchYouTube(query, { limit: limitNum });
    return Response.json({ results });
  } catch (error) {
    const status = error instanceof MusicServiceError ? 502 : 500;
    console.error("[/api/youtube/search]", error);
    return Response.json(
      { error: error?.message || "Failed to search YouTube." },
      { status }
    );
  }
}