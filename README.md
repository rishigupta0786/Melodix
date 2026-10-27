# Melodix

A music player built with Next.js 16, React 19 and Tailwind CSS v4. It streams songs by genre from JioSaavn, plays YouTube results, and plays music files from your device. It can also be built as an Android app with Capacitor.

## Features

- **Genre-based discovery**: pick a genre and get a continuous queue of tracks from JioSaavn
- **YouTube search and playback**
- **Local music**: play audio files stored on your device
- **Favorites** and a queue with next, previous and remove
- **Rotating wallpapers** behind a glassmorphism UI
- **Android app** via Capacitor

## Getting started

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then fill in YOUTUBE_API_KEY
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The dev server runs on port **3001**, not the Next.js default of 3000.

### Environment variables

| Variable | Required for | How to get it |
|----------|--------------|---------------|
| `YOUTUBE_API_KEY` | YouTube search | Create a key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and enable "YouTube Data API v3" |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 3001 |
| `npm run lint` | Run ESLint |
| `npm run mobile:build` | Build and sync the Android project |
| `npm run mobile:apk` | Build a debug APK |

See [MOBILE_SETUP_GUIDE.md](MOBILE_SETUP_GUIDE.md) for the full Android setup.

## Project layout

```
app/          Pages, layout and API route handlers (app/api/*)
components/   UI components (player, controls, YouTube, local music, ...)
hooks/        Player, queue, favorites and search hooks
services/     Data access: JioSaavn, YouTube, wallpapers, favorites
lib/          Vendored JioSaavn API library
```

More detail on the architecture is in [PROJECT.md](PROJECT.md).
