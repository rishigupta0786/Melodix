# Vibe Coding Music Player - Project Documentation

## Overview

A full-stack music streaming application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and the **JioSaavn API** (via a cloned TypeScript library). The app features genre-based music discovery, continuous playback with a queue system, dynamic wallpaper rotation, and a glassmorphism UI.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.3.3 (App Router, React Server Components) |
| React | 19.2.8 |
| Styling | Tailwind CSS v4 + CSS Variables (glassmorphism design system) |
| Language | JavaScript (ESM) with JSX |
| API Layer | Next.js Route Handlers (`app/api/`) |
| Music API | JioSaavn (via `lib/jiosaavn-api` - a TypeScript port) |
| Wallpaper API | Picsum Photos (`picsum.photos/v2/list`) |
| Audio | Native HTML5 `<audio>` element |
| Dev Tools | ESLint 9, Node.js |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  app/page.js (Client Component)                                              │
│  ├─ useMusicQueue() ──────► fetchTracksForGenre() ──────► /api/tracks       │
│  ├─ useAudioPlayer() ────► HTML5 <audio> element                            │
│  └─ useWallpaperRotation() ─► fetchWallpaper() ──────► picsum.photos        │
│                                                                              │
│  Components:                                                                 │
│  ├─ Sidebar / MobileGenreSelector  ──► Genre selection                      │
│  ├─ MusicPlayer                                                          │
│  │   ├─ TrackInfo                                                         │
│  │   ├─ ProgressBar                                                       │
│  │   └─ PlayerControls                                                    │
│  └─ WallpaperBackground                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Node.js)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  app/api/tracks/route.js (GET)                                              │
│  └─ searchGenre(genreId) ──────► saavn.server.js                           │
│       └─ SearchService (from lib/jiosaavn-api)                              │
│            └─ JioSaavn API (unofficial, server-side only)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Server-side JioSaavn Proxy**: The browser never calls JioSaavn directly. All requests go through `/api/tracks` → `saavn.server.js` → `SearchService`. This avoids CORS issues and keeps the third-party API server-side.

2. **Provider-agnostic Genres**: `services/genres.js` defines curated search queries (not actual genres). Safe to import on both client and server.

3. **Reducer-based Queue**: `useMusicQueue` uses `useReducer` for predictable state transitions (fetch, next, previous, remove).

4. **Playback Intent Pattern**: `useAudioPlayer` tracks `intentRef` to respect browser autoplay policies—playback only continues automatically after explicit user interaction.

---

## File Structure

```
vibe-coding-music-player/
├── app/
│   ├── api/
│   │   └── tracks/
│   │       └── route.js           # Next.js Route Handler - proxies JioSaavn search
│   ├── globals.css                # Tailwind v4 + CSS variables (design system)
│   ├── layout.js                  # Root layout, font loading, metadata
│   └── page.js                    # Main page (client component)
├── components/
│   ├── MusicPlayer.js             # Main player container (composes sub-components)
│   ├── TrackInfo.js               # Displays track title, artist, artwork
│   ├── ProgressBar.js             # Seekable progress bar with time display
│   ├── PlayerControls.js          # Play/pause, next/prev, volume slider, mute
│   ├── Sidebar.js                 # Desktop genre navigation sidebar
│   ├── MobileGenreSelector.js     # Mobile genre dropdown
│   └── WallpaperBackground.js     # Full-screen rotating wallpaper
├── hooks/
│   ├── useMusicQueue.js           # Genre selection, track fetching, queue management
│   ├── useAudioPlayer.js          # Audio playback, seeking, volume, autoplay policy
│   └── useWallpaperRotation.js    # Periodic wallpaper fetching + preloading
├── services/
│   ├── genres.js                  # Genre catalogue + MusicServiceError class
│   ├── musicService.js            # Client-side fetch wrapper for /api/tracks
│   ├── saavn.server.js            # Server-side JioSaavn search + normalization
│   └── wallpaperService.js        # Picsum Photos fetching, caching, preloading
├── lib/
│   └── jiosaavn-api/              # Cloned JioSaavn TypeScript library (submodule)
│       ├── src/
│       │   ├── modules/search/services/search.service.ts
│       │   └── ... (full JioSaavn API implementation)
├── public/                        # Static assets
├── package.json
├── next.config.mjs
├── jsconfig.json                  # Path aliases (#modules/*, #common/*)
├── AGENTS.md                      # Next.js agent rules
├── CLAUDE.md                      # References AGENTS.md
└── README.md                      # Default Next.js README
```

---

## Core Modules Deep Dive

### 1. Genre System (`services/genres.js`)

```javascript
export const GENRES = [
  { id: "bollywood", label: "Bollywood Hits", query: "bollywood hits" },
  { id: "arijit", label: "Arijit Singh", query: "arijit singh" },
  { id: "romantic", label: "Romantic", query: "romantic hindi songs" },
  { id: "nineties", label: "90s Hindi", query: "90s hindi songs" },
  { id: "punjabi", label: "Punjabi", query: "punjabi hits" },
  { id: "lofi", label: "Hindi Lo-fi", query: "hindi lofi" },
  { id: "party", label: "Party", query: "bollywood party songs" },
  { id: "sad", label: "Sad", query: "sad hindi songs" },
  { id: "indie", label: "Indie", query: "hindi indie" },
];
```

- **Purpose**: Each "genre" is a curated search query string sent to JioSaavn.
- **Dual-use**: Imported by both client (`musicService.js`) and server (`saavn.server.js`).
- **Error Class**: `MusicServiceError` - custom error with `cause` support for error chaining.

---

### 2. Client Music Service (`services/musicService.js`)

```javascript
export async function fetchTracksForGenre(genreId) {
  const response = await fetch(`/api/tracks?genre=${encodeURIComponent(genreId)}`);
  const data = await response.json();
  if (!response.ok) throw new MusicServiceError(data?.error || `Error (${response.status})`);
  return Array.isArray(data?.tracks) ? data.tracks : [];
}
```

- **Responsibility**: Thin wrapper around `/api/tracks` route.
- **Error Handling**: Catches network errors, parses JSON safely, throws typed `MusicServiceError`.
- **Returns**: Array of normalized track objects.

---

### 3. Server JioSaavn Integration (`services/saavn.server.js`)

```javascript
import { SearchService } from "#modules/search/services/search.service";

export async function searchGenre(genreId, { limit = 40 } = {}) {
  const genre = GENRES.find((entry) => entry.id === genreId);
  const data = await searchService.searchSongs({ query: genre.query, page: 0, limit });
  const tracks = (data?.results || [])
    .map((raw) => normalizeTrack(raw, genre.label))
    .filter(Boolean);
  return shuffle(tracks);
}
```

#### Normalization (`normalizeTrack`)

| Raw Field | Normalized Output |
|-----------|-------------------|
| `raw.id` | `id: "saavn-{id}"` |
| `raw.name` / `raw.title` | `title` (HTML entities decoded) |
| `raw.artists.primary[]` | `artist` (comma-joined) |
| `raw.downloadUrl[]` / `raw.downloadUrls[]` | `streamUrl` (highest bitrate) |
| `raw.image[]` / `raw.images[]` | `artwork` (largest image) |
| `raw.duration` | `duration` (number, seconds) |
| `genre.label` | `genre` |

#### Helpers

- **`pickStreamUrl()`**: Selects highest bitrate from `downloadUrl`/`downloadUrls` array.
- **`pickArtwork()`**: Returns largest image (last in array).
- **`pickArtist()`**: Prefers `artists.primary`, falls back to `primaryArtists`/`subtitle`.
- **`decodeEntities()`**: Decodes `&`, `"`, `&#039;`, `<`, `>`.
- **`shuffle()`**: Fisher-Yates shuffle for variety.

#### DNS Fix

```javascript
import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first"); // Avoids IPv6 fetch failures on some hosts
```

---

### 4. API Route (`app/api/tracks/route.js`)

```javascript
export async function GET(request) {
  const genre = new URL(request.url).searchParams.get("genre");
  if (!genre) return Response.json({ error: "Missing ?genre parameter." }, { status: 400 });

  try {
    const tracks = await searchGenre(genre);
    return Response.json({ tracks });
  } catch (error) {
    const status = error instanceof MusicServiceError ? 502 : 500;
    return Response.json({ error: error?.message || "Failed to load tracks." }, { status });
  }
}
```

- **Input**: `?genre=<genreId>`
- **Output**: `{ tracks: Track[] }`
- **Error Codes**: `400` (missing param), `502` (MusicServiceError), `500` (unexpected)

---

### 5. Queue Management (`hooks/useMusicQueue.js`)

#### State (via `useReducer`)

```javascript
const initialQueueState = {
  tracks: [],
  currentTrackIndex: 0,
  resolvedGenre: null,  // Which genre the current queue reflects
  error: null,
};
```

#### Actions

| Action | Description |
|--------|-------------|
| `FETCH_SUCCESS` | Replaces queue with new tracks, resets index to 0 |
| `FETCH_ERROR` | Clears tracks, stores error message |
| `NEXT` | Increments index (wraps) |
| `PREVIOUS` | Decrements index (wraps) |
| `REMOVE_CURRENT` | Removes current track, adjusts index |

#### Loading State Derivation

```javascript
const isLoading = queue.resolvedGenre !== selectedGenre;
// No separate loading state - derived from genre mismatch
```

#### Exported API

```javascript
{
  genres,              // GENRES array
  selectedGenre,       // Current genre ID
  selectGenre(genreId),// Switch genre (triggers fetch)
  tracks,              // Current queue
  currentTrackIndex,   // Index in queue
  currentTrack,        // Track object or null
  isLoading,           // Boolean
  error,               // Error string or null
  goToNext(),          // Next track
  goToPrevious(),      // Previous track
  dropCurrentTrack(),  // Remove current from queue
}
```

#### Fetch Effect

```javascript
useEffect(() => {
  let cancelled = false;
  fetchTracksForGenre(selectedGenre)
    .then((tracks) => { if (!cancelled) dispatch({ type: "FETCH_SUCCESS", genre: selectedGenre, tracks }); })
    .catch((err) => { if (!cancelled) dispatch({ type: "FETCH_ERROR", genre: selectedGenre, message: err.message }); });
  return () => { cancelled = true; };
}, [selectedGenre]);
```

---

### 6. Audio Playback (`hooks/useAudioPlayer.js`)

#### State

```javascript
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [volume, setVolumeState] = useState(0.8);
const [isMuted, setIsMuted] = useState(false);
```

#### Refs

```javascript
const audioRef = useRef(null);       // HTMLAudioElement
const intentRef = useRef(false);     // User has explicitly requested playback
const onEndedRef = useRef(onEnded);  // Stable callback ref
const onErrorRef = useRef(onError);
```

#### Autoplay Policy Handling

```javascript
// On track change:
audio.autoplay = intentRef.current;
audio.src = track.streamUrl;
if (intentRef.current) {
  audio.play().catch(() => setIsPlaying(false));
}

// User presses Play:
const play = useCallback(() => {
  intentRef.current = true;
  audioRef.current?.play().catch(() => setIsPlaying(false));
}, []);

// User presses Pause:
const pause = useCallback(() => {
  intentRef.current = false;
  audioRef.current?.pause();
}, []);
```

- **Rule**: New genre selection → `intentRef.current = false` → loads paused.
- **Auto-advance**: `onEnded` fires → `goToNext()` → new track loads → `intentRef.current` still `true` → autoplays.

#### Event Listeners (attached once)

```javascript
useEffect(() => {
  const audio = audioRef.current;
  audio.addEventListener("play", () => setIsPlaying(true));
  audio.addEventListener("pause", () => setIsPlaying(false));
  audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
  audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));
  audio.addEventListener("ended", () => onEndedRef.current?.());
  audio.addEventListener("error", () => onErrorRef.current?.(audio.error));
  return () => { /* remove all */ };
}, []);
```

#### Volume & Mute Sync

```javascript
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  audio.volume = volume;
  audio.muted = isMuted;
}, [volume, isMuted]);
```

#### Exported API

```javascript
{
  audioRef,           // Attach to <audio ref={audioRef} />
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  play(), pause(), togglePlay(),
  seek(time),
  setVolume(0-1),
  toggleMute(),
}
```

---

### 7. Wallpaper Rotation (`hooks/useWallpaperRotation.js` + `services/wallpaperService.js`)

#### Service (`wallpaperService.js`)

```javascript
const LIST_ENDPOINT = "https://picsum.photos/v2/list?page=1&limit=100";
const RECENT_MEMORY = 8; // Avoid repeats

let cachedList = null;
let listPromise = null;
const recentIds = [];

async function getImageList() {
  if (cachedList) return cachedList;
  if (!listPromise) {
    listPromise = fetch(LIST_ENDPOINT).then(...).catch(...);
  }
  return listPromise;
}

export async function fetchWallpaper({ width = 1920, height = 1080 } = {}) {
  const list = await getImageList();
  const candidates = list.filter((item) => !recentIds.includes(item.id));
  const pool = candidates.length ? candidates : list;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  recentIds.push(entry.id);
  if (recentIds.length > RECENT_MEMORY) recentIds.shift();
  return { id: entry.id, url: `https://picsum.photos/id/${entry.id}/${width}/${height}`, alt: `...` };
}

export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new WallpaperServiceError("Failed to load wallpaper image."));
    img.src = url;
  });
}
```

#### Hook (`useWallpaperRotation.js`)

```javascript
const DEFAULT_INTERVAL_MS = 18 * 60 * 1000; // ~18 minutes

export function useWallpaperRotation({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const [wallpaper, setWallpaper] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const loadNext = useCallback(async () => {
    try {
      const next = await fetchWallpaper();
      await preloadImage(next.url);
      if (!mountedRef.current) return;
      setWallpaper(next);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.message || "Could not load a new wallpaper.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(loadNext, 0);      // Immediate first load
    const intervalId = setInterval(loadNext, intervalMs); // Then every ~18 min
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, [loadNext, intervalMs]);

  return { wallpaper, error };
}
```

- **Caching**: Image list fetched once, cached in module scope.
- **Deduplication**: Tracks last 8 shown IDs to avoid immediate repeats.
- **Preloading**: Image fully loads before state update (no flash).
- **Error Resilience**: Keeps current wallpaper on error; never blanks background.

---

### 8. UI Components

#### `components/MusicPlayer.js`
- **Composes**: `TrackInfo`, `ProgressBar`, `PlayerControls`
- **Props**: All playback state + callbacks from `useAudioPlayer` + queue state from `useMusicQueue`
- **Loading/Error/Empty States**: Shows centered messages via `StatusMessage`

#### `components/TrackInfo.js`
- Displays artwork (fallback gradient), title, artist, genre badge

#### `components/ProgressBar.js`
- Native `<input type="range">` styled with CSS variables
- Shows current/total time (MM:SS format)
- Disabled during loading/error/empty

#### `components/PlayerControls.js`
- **Volume**: Mute toggle + range slider (hidden on mobile)
- **Transport**: Previous, Play/Pause (large), Next
- **Icons**: Inline SVGs (Play, Pause, Previous, Next, Volume, Mute)
- **Glass Panel**: Wrapped in `glass-panel` utility class

#### `components/Sidebar.js` + `MobileGenreSelector.js`
- Sidebar: Vertical list with active indicator dot
- Mobile: `<select>` dropdown (semantic, accessible)

#### `components/WallpaperBackground.js`
```javascript
export default function WallpaperBackground({ wallpaper }) {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      {wallpaper ? (
        <img src={wallpaper.url} alt={wallpaper.alt} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.6))]" />
    </div>
  );
}
```

---

## Design System (`app/globals.css`)

### CSS Variables (Light/Dark via `prefers-color-scheme`)

```css
:root {
  --color-bg: #0b0b0c;
  --color-bg-elevated: #141416;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-accent: #e879f9;      /* Fuchsia */
  --color-accent-soft: #fdf4ff;
  --color-border: #2a2a2e;
  --color-border-strong: #3f3f46;
  --shadow-elevation: 0 10px 30px -10px rgba(0,0,0,0.5);
  --glass-bg: rgba(20,20,22,0.7);
  --glass-border: rgba(255,255,255,0.08);
  --glass-backdrop: blur(24px) saturate(180%);
}

@media (prefers-color-scheme: light) {
  :root {
    --color-bg: #fafafa;
    --color-bg-elevated: #ffffff;
    --color-text-primary: #171717;
    --color-text-secondary: #525252;
    --color-accent: #a21caf;
    --color-accent-soft: #fdf4ff;
    --color-border: #e5e5e5;
    --color-border-strong: #d4d4d4;
    --shadow-elevation: 0 10px 30px -10px rgba(0,0,0,0.15);
    --glass-bg: rgba(255,255,255,0.8);
    --glass-border: rgba(0,0,0,0.06);
    --glass-backdrop: blur(24px) saturate(180%);
  }
}
```

### Utility Classes

```css
.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-backdrop);
  box-shadow: var(--shadow-elevation);
}

.focus-ring {
  outline: none;
}
.focus-ring:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

---

## Data Flow Summary

### Genre Selection → Track Queue

```
User clicks genre (Sidebar/MobileSelector)
        │
        ▼
useMusicQueue.selectGenre(genreId)
        │
        ▼
setSelectedGenre(genreId) ───► useEffect([selectedGenre]) fires
        │                              │
        │                              ▼
        │                      fetchTracksForGenre(genreId)
        │                              │
        │                              ▼
        │                      GET /api/tracks?genre=...
        │                              │
        │                              ▼
        │                      searchGenre(genreId) [server]
        │                              │
        │                              ▼
        │                      SearchService.searchSongs({query, limit})
        │                              │
        │                              ▼
        │                      JioSaavn API (unofficial)
        │                              │
        │                              ▼
        │                      Normalize + Shuffle
        │                              │
        │                              ▼
        │                      Return Track[]
        │                              │
        ▼                              ▼
dispatch(FETCH_SUCCESS) ◄────────── Response.json({tracks})
        │
        ▼
State updated: tracks[], currentTrackIndex=0, resolvedGenre=genreId
        │
        ▼
currentTrack = tracks[0] passed to useAudioPlayer
        │
        ▼
Audio src set, paused (intentRef=false)
```

### Playback Flow

```
User clicks Play
        │
        ▼
togglePlay() → play()
        │
        ▼
intentRef.current = true
audio.autoplay = true
audio.play()
        │
        ▼
"play" event → setIsPlaying(true)
        │
        ▼
Track ends → "ended" event → onEndedRef.current()
        │
        ▼
goToNext() → dispatch(NEXT) → currentTrackIndex++
        │
        ▼
useAudioPlayer useEffect([track.id]) fires
        │
        ▼
audio.autoplay = intentRef.current (still true!)
audio.src = newTrack.streamUrl
audio.play() → continues seamlessly
```

---

## Error Handling Strategy

| Layer | Approach |
|-------|----------|
| **Network** | `fetch` wrapped in try/catch; `MusicServiceError` / `WallpaperServiceError` with `cause` |
| **API Route** | Catches all errors; returns `502` for known service errors, `500` for unknown |
| **Queue Hook** | `FETCH_ERROR` action stores message; UI shows error in `MusicPlayer` |
| **Audio Hook** | `onError` callback → `dropCurrentTrack()` → advances queue |
| **Wallpaper** | Errors logged, current wallpaper retained, error state shown (non-blocking) |
| **Image Preload** | Promise-based; rejects on `onerror`; caught by hook |

---

## Scripts & Commands

```bash
npm run dev      # Start dev server on port 3001
npm run build    # Production build
npm run start    # Start production server on port 3001
npm run lint     # Run ESLint
```

---

## Environment & Configuration

### `next.config.mjs`
```javascript
// Minimal - uses defaults, no custom config needed
```

### `jsconfig.json` (Path Aliases)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "#modules/*": "./lib/jiosaavn-api/src/modules/*",
      "#common/*": "./lib/jiosaavn-api/src/common/*"
    }
  }
}
```

### `package.json` Key Dependencies
```json
{
  "dependencies": {
    "next": "16.3.3",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "hono": "^4.13.7",              // Used by jiosaavn-api internally
    "node-forge": "^1.4.0"          // Crypto for JioSaavn API signing
  }
}
```

---

## Extending the Project

### Add a New Genre
Edit `services/genres.js`:
```javascript
{ id: "ghazal", label: "Ghazals", query: "hindi ghazal" }
```

### Change Wallpaper Source
Modify `services/wallpaperService.js`:
- Change `LIST_ENDPOINT`
- Update `normalizeWallpaper()` for new API response shape
- Adjust `fetchWallpaper()` logic

### Adjust Rotation Interval
```javascript
// In page.js or hook call:
useWallpaperRotation({ intervalMs: 10 * 60 * 1000 }) // 10 minutes
```

### Add Track Metadata
Extend `normalizeTrack()` in `saavn.server.js` to include:
- Album name
- Release year
- Lyrics (if available)
- Explicit flag

---

## Known Limitations & Future Improvements

| Area | Limitation | Potential Fix |
|------|------------|---------------|
| **Offline** | No service worker / caching | Add Workbox / next-pwa |
| **Search** | Genre-only, no free-text search | Add search page + API route |
| **Favorites** | No persistence | Add localStorage / IndexedDB / auth + DB |
| **Lyrics** | Not fetched | Extend `normalizeTrack` + JioSaavn lyrics endpoint |
| **Quality Selection** | Auto-picks highest bitrate | Expose quality options in UI |
| **Queue Persistence** | Lost on refresh | Save to localStorage |
| **SSR Audio** | Hydration mismatch risk | Current client-only approach is correct |

---

## Debugging Tips

1. **Check Network Tab**: Filter by `/api/tracks` to see genre requests/responses
2. **Console Logs**: `[/api/tracks]` errors logged server-side
3. **React DevTools**: Inspect `useMusicQueue` / `useAudioPlayer` state
4. **Audio Element**: `audioRef.current` gives direct access for debugging
5. **Wallpaper**: Check `wallpaper` state in `useWallpaperRotation` hook

---

## License

Private project - Vibe Coding Music Player