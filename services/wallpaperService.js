const LIST_ENDPOINT = "https://picsum.photos/v2/list?page=1&limit=100";
const RECENT_MEMORY = 8;

let cachedList = null;
let listPromise = null;
const recentIds = [];

export class WallpaperServiceError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "WallpaperServiceError";
    if (options?.cause) this.cause = options.cause;
  }
}

async function getImageList() {
  if (cachedList) return cachedList;
  if (!listPromise) {
    listPromise = fetch(LIST_ENDPOINT)
      .then((response) => {
        if (!response.ok) {
          throw new WallpaperServiceError(
            `Wallpaper service responded with an error (${response.status}).`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new WallpaperServiceError("Wallpaper service returned no images.");
        }
        cachedList = data;
        return cachedList;
      })
      .catch((error) => {
        listPromise = null;
        if (error instanceof WallpaperServiceError) throw error;
        throw new WallpaperServiceError("Could not reach the wallpaper service.", {
          cause: error,
        });
      });
  }
  return listPromise;
}

function normalizeWallpaper(entry, width, height) {
  return {
    id: entry.id,
    url: `https://picsum.photos/id/${entry.id}/${width}/${height}`,
    alt: `A calm photograph by ${entry.author}`,
  };
}

export async function fetchWallpaper({ width = 1920, height = 1080 } = {}) {
  const list = await getImageList();
  const candidates = list.filter((item) => !recentIds.includes(item.id));
  const pool = candidates.length ? candidates : list;
  const entry = pool[Math.floor(Math.random() * pool.length)];

  recentIds.push(entry.id);
  if (recentIds.length > RECENT_MEMORY) recentIds.shift();

  return normalizeWallpaper(entry, width, height);
}

export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new WallpaperServiceError("Failed to load wallpaper image."));
    img.src = url;
  });
}
