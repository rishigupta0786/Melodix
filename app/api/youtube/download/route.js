import fs from "node:fs";
import { Readable } from "node:stream";
import {
  convertYouTubeAudio,
  fetchDirectAudio,
  mimeForExt,
  takeReadyDownload,
  YOUTUBE_ID_PATTERN,
} from "@/services/youtubeDownload.server";
import { sanitizeFilename } from "@/lib/utils/filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two modes:
//   ?v=<videoId> or ?src=<audio url> -> Server-Sent Events: `progress` {percent}, then `done` {token, ext} or `error` {message}
//   ?token=<token> -> streams the finished MP3 as an attachment (?title= sets the file name)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) return serveFile(token, sanitizeFilename(searchParams.get("title")) || "song");

  const videoId = searchParams.get("v");
  const src = searchParams.get("src");
  if (!src && (!videoId || !YOUTUBE_ID_PATTERN.test(videoId))) {
    return Response.json({ error: "Missing or invalid ?v or ?src parameter." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // client disconnected
        }
      };

      try {
        const onProgress = (percent) => send("progress", { percent });
        const result = src
          ? await fetchDirectAudio(src, onProgress)
          : await convertYouTubeAudio(videoId, onProgress);
        send("done", result);
      } catch (error) {
        console.error("[/api/youtube/download]", error);
        send("error", { message: error?.message || "Failed to download song." });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function serveFile(token, name) {
  const entry = takeReadyDownload(token);
  if (!entry) return Response.json({ error: "Download expired or not found." }, { status: 404 });

  const { size } = await fs.promises.stat(entry.filePath);
  const nodeStream = fs.createReadStream(entry.filePath);
  nodeStream.on("close", entry.cleanup);
  nodeStream.on("error", entry.cleanup);

  const asciiName = name.replace(/[^\x20-\x7E]/g, "").replace(/"/g, "") || "song";

  return new Response(Readable.toWeb(nodeStream), {
    headers: {
      "Content-Type": mimeForExt(entry.ext),
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${asciiName}.${entry.ext}"; filename*=UTF-8''${encodeURIComponent(name)}.${entry.ext}`,
      "Cache-Control": "no-store",
    },
  });
}
