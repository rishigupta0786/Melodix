// Downloads the standalone yt-dlp binary used by /api/youtube/download.
// Runs on `npm install` (postinstall). Failure is non-fatal so installs never break.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

const IS_WINDOWS = os.platform() === "win32";
const FILENAME = IS_WINDOWS ? "yt-dlp.exe" : "yt-dlp_linux";
const URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${FILENAME}`;
const BIN_DIR = path.join(process.cwd(), "bin");
const DEST = path.join(BIN_DIR, FILENAME);

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await exists(DEST)) {
    console.log(`[setup] ${FILENAME} already present, skipping.`);
    return;
  }

  await fs.mkdir(BIN_DIR, { recursive: true });
  console.log(`[setup] Downloading ${FILENAME}...`);

  const response = await fetch(URL, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${URL} (${response.status})`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(DEST));
  if (!IS_WINDOWS) await fs.chmod(DEST, 0o755);
  console.log("[setup] Done.");
}

main().catch((error) => {
  console.warn("[setup] Could not install yt-dlp; song downloads will be unavailable.", error.message);
});
