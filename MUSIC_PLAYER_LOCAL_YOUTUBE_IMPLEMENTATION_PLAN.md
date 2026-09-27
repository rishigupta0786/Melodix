# Music Player — Local Music + YouTube Implementation Plan

## 1. Purpose

This document defines the implementation plan for extending the existing **Vibe Coding Music Player** with two new music sources:

1. **YouTube** — search YouTube from inside the app and play selected videos using the official YouTube player.
2. **Local Music** — a mobile app that discovers audio files on the user's device, groups them folder-wise, and exposes them under a **My Favorites / Local Music** experience.

The existing JioSaavn-based online player remains a separate source and should continue working as it does today.

---

## 2. Existing Project Baseline

The current project is a Next.js 16.3.3 App Router application using React 19.2.8, Tailwind CSS v4, a server-side JioSaavn integration, and the native HTML5 `<audio>` element.

The current architecture already separates:
- genre selection,
- track fetching,
- queue management,
- audio playback,
- UI components, and
- server-side music API access.

The existing `/api/tracks` route proxies genre requests to the JioSaavn service, while `useMusicQueue` manages the queue and `useAudioPlayer` manages the native audio element.

Source reference: the current project documentation describes the JioSaavn server proxy and the existing player architecture. See `PROJECT.md` for the detailed baseline.

---

## 3. Target Product Structure

The application should ultimately have **three music sources/sections**:

```text
Music App
│
├── Online
│   └── Existing JioSaavn-based genres
│
├── YouTube
│   ├── Search YouTube
│   ├── Search results
│   ├── Add to Favorites
│   └── Play using YouTube player
│
└── My Favorites / Local
    ├── YouTube Favorites
    └── Local Music
        ├── SnapTube
        ├── WhatsApp Audio
        ├── WhatsApp Voice
        ├── Recordings
        └── Other device folders
```

The important architectural rule is:

> **Do not replace the existing JioSaavn player. Add YouTube and Local as separate providers behind a common player/navigation model.**

---

# PART A — YOUTUBE SETUP

## 4. YouTube Feature Goals

The YouTube section should allow the user to:

1. Search YouTube from inside the application.
2. See search results with:
   - title
   - thumbnail
   - channel name
   - duration where available
3. Select a result.
4. Play the selected video inside the application.
5. Add/remove the result from My Favorites.
6. Re-open a saved YouTube favorite later.
7. Keep YouTube playback separate from direct audio playback.

### Important restriction

The app should use the **official YouTube APIs/player flow**.

The application must not:
- scrape YouTube's audio stream,
- download/extract YouTube audio to bypass the player,
- proxy YouTube audio as a custom MP3 stream,
- attempt to remove or suppress YouTube advertisements.

YouTube playback should remain under the YouTube player experience. Ads cannot be guaranteed to disappear.

---

## 5. YouTube Architecture

Recommended flow:

```text
User
  │
  ▼
YouTube Search UI
  │
  ▼
Next.js API Route
/api/youtube/search
  │
  ▼
YouTube Data API
  │
  ▼
Normalized YouTube Results
  │
  ▼
Search Result Cards
  │
  ├── Play
  └── Add to Favorites
```

Playback:

```text
YouTube Result
      │
      ▼
YouTube Video ID
      │
      ▼
Official YouTube Player
      │
      ▼
Playback inside app
```

---

## 6. YouTube API Setup

Create a Google Cloud project and enable the **YouTube Data API v3**.

Create an API key and keep it server-side.

Recommended environment variable:

```env
YOUTUBE_API_KEY=your_api_key
```

Do not expose the secret key through client-side JavaScript.

---

## 7. YouTube API Route

Add:

```text
app/
└── api/
    └── youtube/
        └── search/
            └── route.js
```

Expected client request:

```text
GET /api/youtube/search?q=arijit+singh
```

Expected normalized response:

```json
{
  "results": [
    {
      "id": "youtube-video-id",
      "provider": "youtube",
      "title": "Song Title",
      "channel": "Channel Name",
      "thumbnail": "https://...",
      "publishedAt": "...",
      "url": "https://www.youtube.com/watch?v=..."
    }
  ]
}
```

The client should never need to know how the YouTube API request is authenticated.

---

## 8. YouTube Search Service

Add:

```text
services/
└── youtubeService.server.js
```

Responsibilities:

- validate search input,
- call YouTube Data API,
- request video results,
- normalize API responses,
- handle API errors,
- optionally limit result count,
- return only fields required by the UI.

Suggested function:

```javascript
searchYouTube(query, options)
```

Example internal flow:

```text
searchYouTube()
    │
    ▼
YouTube Data API
    │
    ▼
items[]
    │
    ▼
normalizeYouTubeResult()
    │
    ▼
YouTubeTrack[]
```

---

## 9. YouTube Player

Do **not** pass a YouTube URL into the existing HTML5 `<audio>` element.

The existing player expects a direct audio `streamUrl`. A YouTube video is not the same thing.

Instead introduce a provider-aware player:

```text
components/
├── MusicPlayer.js
├── YouTubePlayer.js
└── UnifiedPlayer.js
```

Concept:

```javascript
track.provider === "saavn"
    → HTML5 audio player

track.provider === "youtube"
    → YouTube player

track.provider === "local"
    → HTML5 audio player
```

This keeps the existing JioSaavn player intact.

---

# PART B — MY FAVORITES

## 10. Favorites Goals

My Favorites should become a unified library rather than being tied to one provider.

A favorite item should contain a provider.

Example:

```json
{
  "id": "youtube-dQw4w9WgXcQ",
  "provider": "youtube",
  "title": "Song Title",
  "artist": "Artist",
  "thumbnail": "...",
  "youtubeVideoId": "dQw4w9WgXcQ"
}
```

Local example:

```json
{
  "id": "local-12345",
  "provider": "local",
  "title": "Song.mp3",
  "folder": "SnapTube",
  "uri": "...",
  "duration": 240
}
```

---

## 11. Favorites Storage

### Phase 1 — Web

Use:

```text
localStorage
```

for lightweight YouTube favorite metadata.

Example:

```text
music_favorites
```

Stored value:

```json
[
  {
    "id": "youtube-abc123",
    "provider": "youtube",
    "title": "Song",
    "youtubeVideoId": "abc123"
  }
]
```

This avoids introducing a database just for the first version.

### Phase 2 — Cross-device sync

If favorites need to appear on multiple devices, introduce:

```text
Database
    │
    ├── users
    └── favorites
```

At that point favorites can be synchronized between the web app and mobile app.

---

# PART C — LOCAL MOBILE MUSIC

## 12. Local Music Goal

The mobile application should discover audio files already stored on the phone.

The app should **not upload the user's local audio files to the server by default**.

Instead:

```text
Phone Storage
     │
     ▼
Mobile App
     │
     ▼
Scan / Index Audio Files
     │
     ▼
Group by Folder
     │
     ▼
My Favorites / Local Music
```

Example:

```text
My Favorites

Local Music
│
├── SnapTube
│   ├── Song 1
│   ├── Song 2
│   └── Song 3
│
├── WhatsApp Audio
│   ├── Audio 1
│   └── Audio 2
│
├── WhatsApp Voice
│   ├── Voice 1
│   └── Voice 2
│
└── Recordings
    ├── Recording 1
    └── Recording 2
```

---

## 13. Important Platform Decision

For the first local-storage implementation, **Android-first** is recommended.

Reason:

- Android exposes device media more directly.
- Audio files can be indexed through Android media APIs.
- Folder/path metadata is more accessible.
- WhatsApp, recordings, downloaded music, and other media can be represented more naturally.

iOS should be treated as a separate phase because its file/media sandbox and folder access model are different.

---

# PART D — MOBILE APP ARCHITECTURE

## 14. Recommended Mobile Architecture

Use a mobile client that can access the device's media library.

Recommended high-level structure:

```text
mobile/
├── screens/
│   ├── Home
│   ├── YouTube
│   ├── MyFavorites
│   └── LocalFolder
│
├── components/
│   ├── LocalSongCard
│   ├── FolderCard
│   ├── MiniPlayer
│   └── FullPlayer
│
├── services/
│   ├── localMusicService
│   ├── youtubeService
│   └── favoritesService
│
├── hooks/
│   ├── useLocalMusic
│   ├── useFavorites
│   └── usePlayer
│
└── storage/
    └── localDatabase
```

The exact React Native framework/library choice should be finalized before implementation because folder-level Android access may require native Android capabilities.

---

# PART E — LOCAL AUDIO INDEXING

## 15. Local Audio Scanner

The scanner should identify supported audio files.

Initial supported formats:

```text
.mp3
.m4a
.aac
.wav
.ogg
.flac
```

The scanner should collect:

```json
{
  "id": "device-audio-id",
  "title": "Song Name",
  "artist": "Artist",
  "album": "Album",
  "duration": 220,
  "uri": "content://...",
  "folder": "SnapTube",
  "mimeType": "audio/mpeg"
}
```

Do not copy the audio file unless explicitly required.

The player should use the device URI/reference directly.

---

## 16. Folder Grouping

The local music service should convert a flat media list into folders.

Input:

```text
Song A → /Music/SnapTube/
Song B → /Music/SnapTube/
Song C → /WhatsApp/Media/WhatsApp Audio/
Song D → /Recordings/
```

Output:

```javascript
[
  {
    id: "snaptube",
    name: "SnapTube",
    songs: [...]
  },
  {
    id: "whatsapp-audio",
    name: "WhatsApp Audio",
    songs: [...]
  },
  {
    id: "recordings",
    name: "Recordings",
    songs: [...]
  }
]
```

---

# PART F — LOCAL PLAYER

## 17. Local Player Requirements

The local player should support:

- play
- pause
- next
- previous
- seek
- volume
- progress
- duration
- background playback where supported
- lock-screen/media notification controls where supported
- queue
- folder-based playback

Example:

```text
Folder: SnapTube

Song 1
Song 2
Song 3
Song 4

[Play All]
```

When Song 1 finishes:

```text
Song 1
  ↓
Song 2
  ↓
Song 3
  ↓
Song 4
```

---

# PART G — UNIFIED PLAYER MODEL

## 18. Provider-Aware Track Model

The existing application currently normalizes JioSaavn tracks.

Extend the model to include:

```javascript
{
  id,
  provider,
  title,
  artist,
  artwork,
  duration
}
```

Provider values:

```text
saavn
youtube
local
```

Provider-specific fields can be added when required.

Example:

```javascript
{
  id: "saavn-123",
  provider: "saavn",
  title: "...",
  artist: "...",
  streamUrl: "..."
}
```

```javascript
{
  id: "youtube-abc",
  provider: "youtube",
  title: "...",
  artist: "...",
  youtubeVideoId: "abc"
}
```

```javascript
{
  id: "local-456",
  provider: "local",
  title: "...",
  artist: "...",
  localUri: "content://..."
}
```

---

## 19. Unified Playback Decision

Create one player orchestration layer:

```text
currentTrack
      │
      ▼
provider?
  │       │        │
  ▼       ▼        ▼
Saavn   YouTube   Local
  │       │        │
  ▼       ▼        ▼
HTML5   YouTube   HTML5
Audio   Player    Audio
```

This is preferable to creating three completely independent playback systems.

---

# PART H — UI STRUCTURE

## 20. Main Navigation

The existing genre sidebar can be extended to:

```text
MUSIC

Online
├── Bollywood Hits
├── Arijit Singh
├── Romantic
├── 90s Hindi
├── Punjabi
├── Hindi Lo-fi
├── Party
├── Sad
└── Indie

YouTube
└── Search YouTube

My Favorites
├── YouTube Favorites
└── Local Music
```

The existing online genres remain unchanged.

---

## 21. YouTube Search UI

Suggested layout:

```text
┌───────────────────────────────────────────┐
│ Search YouTube...                 🔍      │
└───────────────────────────────────────────┘

Search Results

┌───────┬───────────────────────────────────┐
│thumb  │ Song Name                         │
│       │ Artist / Channel                  │
│       │                         ♡  ▶       │
└───────┴───────────────────────────────────┘
```

Clicking `▶` opens/activates the YouTube player.

Clicking `♡` saves it to Favorites.

---

## 22. Local Music UI

```text
My Favorites

LOCAL MUSIC

┌─────────────────────────────────┐
│ 📁 SnapTube                  ›  │
│ 32 songs                        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📁 WhatsApp Audio            ›  │
│ 18 songs                        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📁 WhatsApp Voice            ›  │
│ 11 recordings                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📁 Recordings                ›  │
│ 7 recordings                    │
└─────────────────────────────────┘
```

Inside a folder:

```text
SnapTube

Song 1                         ▶
Song 2                         ▶
Song 3                         ▶
Song 4                         ▶

              [ Play All ]
```

---

# PART I — DATA STORAGE

## 23. Local Mobile Database

Do not rely only on scanning the filesystem every time the user opens the app.

Maintain an indexed database.

Suggested tables/collections:

### `local_tracks`

```text
id
uri
title
artist
album
duration
folder_id
mime_type
last_modified
```

### `local_folders`

```text
id
name
path/reference
song_count
```

### `favorites`

```text
id
provider
provider_track_id
title
artist
artwork
created_at
```

### `playback_state`

```text
provider
track_id
position
updated_at
```

The local database is only an index/metadata store. Audio files remain on the device.

---

# PART J — PERMISSIONS

## 24. Android Permissions

The mobile app must request media/audio access according to the Android version.

Permission flow:

```text
First launch
    │
    ▼
Explain why music access is needed
    │
    ▼
Request audio/media permission
    │
    ├── Granted → Scan/index music
    │
    └── Denied → Show permission explanation
```

Do not request unnecessary permissions.

If a folder picker is used for a specific directory, use the platform's official file-access mechanism.

---

# PART K — SYNC BETWEEN WEBSITE AND MOBILE

## 25. Phase 1 — No Sync

The first version can keep:

```text
Web favorites → Browser localStorage
Mobile local music → Device database
Mobile YouTube favorites → Device database
```

This is the simplest and safest implementation.

---

## 26. Phase 2 — Optional Account Sync

Later:

```text
                    ┌── Web
                    │
Cloud Database ─────┼── Android
                    │
                    └── Future iOS
```

Only metadata should be synchronized.

Local audio files should remain on the user's phone unless the user explicitly chooses to upload them.

---

# PART L — ERROR HANDLING

## 27. YouTube Errors

Handle:

- empty query
- quota exceeded
- invalid API key
- network failure
- video unavailable
- age/region restrictions
- embedding disabled
- deleted/private video

Example UI:

```text
This video cannot be played here.
Try another result.
```

Do not fall back to scraping or extracting the audio stream.

---

## 28. Local Music Errors

Handle:

- permission denied
- file deleted
- file moved
- unsupported format
- corrupted audio
- inaccessible URI
- media database changes

If a saved local track no longer exists:

```text
Song unavailable

The file may have been moved or deleted.

[Remove from Favorites]
```

---

# PART M — IMPLEMENTATION PHASES

## 29. Phase 1 — Refactor Track Model

Before adding new providers:

- introduce `provider`
- keep current JioSaavn normalization
- keep existing `streamUrl`
- ensure current queue/player still works

Goal:

```text
Existing app continues working exactly as before.
```

---

## 30. Phase 2 — YouTube Search

Implement:

```text
YOUTUBE_API_KEY
        ↓
youtubeService.server.js
        ↓
/api/youtube/search
        ↓
YouTube Search UI
```

Test:

- search
- pagination/limited results
- error handling
- result rendering

---

## 31. Phase 3 — YouTube Player

Add official YouTube player integration.

Implement:

- play
- pause
- player state
- video ended
- selected result
- player visibility

Do not connect YouTube URLs to the native audio `streamUrl` system.

---

## 32. Phase 4 — YouTube Favorites

Implement:

```text
Add Favorite
Remove Favorite
Load Favorites
Play Favorite
```

Initial persistence:

```text
localStorage
```

---

## 33. Phase 5 — Mobile App

Create the mobile application.

First implement:

```text
Permission
   ↓
Audio scan
   ↓
Index
   ↓
Folder grouping
   ↓
Folder list
   ↓
Song list
```

---

## 34. Phase 6 — Local Player

Implement:

- local URI playback
- queue
- next/previous
- seek
- background playback
- notification controls
- resume position

---

## 35. Phase 7 — My Favorites Integration

Combine:

```text
YouTube Favorites
+
Local Music
```

under one navigation area.

Do not mix their playback mechanisms internally.

---

## 36. Phase 8 — Polish

Add:

- search/filter for local songs
- sorting
- recently played
- favorite/unfavorite
- play all
- shuffle
- repeat
- folder counts
- empty states
- permission states
- loading states
- error states

---

# PART N — FINAL ARCHITECTURE

## 37. Final Web Architecture

```text
Next.js App
│
├── Online
│   └── JioSaavn
│       ├── /api/tracks
│       ├── useMusicQueue
│       └── HTML5 Audio
│
├── YouTube
│   ├── /api/youtube/search
│   ├── YouTube Search Service
│   ├── YouTube Favorites
│   └── Official YouTube Player
│
└── My Favorites
    └── Saved metadata
```

---

## 38. Final Mobile Architecture

```text
Mobile App
│
├── YouTube
│   ├── Search
│   ├── Favorites
│   └── Official YouTube Player
│
├── My Favorites
│   ├── YouTube Favorites
│   └── Local Music
│
└── Local Music
    ├── Media Scanner
    ├── Folder Index
    ├── Local Database
    └── Local Audio Player
```

---

# PART O — SECURITY & POLICY CHECKLIST

## 39. Rules

### YouTube

- [ ] Use official YouTube Data API for search.
- [ ] Keep API key server-side.
- [ ] Use official YouTube playback/embed mechanism.
- [ ] Do not scrape YouTube audio.
- [ ] Do not download/extract YouTube audio.
- [ ] Do not implement an ad-blocking mechanism.
- [ ] Handle unavailable/embedding-disabled videos gracefully.

### Local Music

- [ ] Ask only for required media permissions.
- [ ] Keep local files on the device by default.
- [ ] Store references/metadata rather than copying files.
- [ ] Handle deleted/moved files.
- [ ] Respect Android/iOS storage restrictions.

---

# PART P — RECOMMENDED DEVELOPMENT ORDER

The safest implementation order is:

```text
1. Preserve existing JioSaavn system
          ↓
2. Add provider field to track model
          ↓
3. Add YouTube API search
          ↓
4. Add YouTube result UI
          ↓
5. Add official YouTube player
          ↓
6. Add YouTube Favorites
          ↓
7. Build Android local-media scanner
          ↓
8. Build folder grouping
          ↓
9. Build local player
          ↓
10. Build My Favorites screen
          ↓
11. Add unified player/miniplayer
          ↓
12. Add optional cloud sync later
```

---

# 40. Definition of Done

The feature set is considered complete when:

### Existing Online Music

- [ ] Existing genres still work.
- [ ] Existing JioSaavn queue still works.
- [ ] Existing HTML5 player still works.

### YouTube

- [ ] User can search YouTube.
- [ ] Search results appear inside the app.
- [ ] User can play a result through the official YouTube player.
- [ ] User can save/remove YouTube favorites.
- [ ] Saved videos can be played later.
- [ ] API errors are handled.

### Local Music

- [ ] Android app can request media permission.
- [ ] Audio files are indexed.
- [ ] Songs are grouped by folder.
- [ ] SnapTube/WhatsApp/Recordings-style folders can be displayed when exposed by the device.
- [ ] User can open a folder and see its songs.
- [ ] User can play local songs.
- [ ] Queue/next/previous works.
- [ ] Missing files are handled gracefully.

### My Favorites

- [ ] YouTube favorites are visible.
- [ ] Local music is visible.
- [ ] Provider-specific playback works.
- [ ] The UI clearly indicates whether an item is YouTube or local.

---

# 41. Important Architectural Decision

The biggest decision is to treat **JioSaavn, YouTube, and Local Music as three providers**, rather than trying to force all three into the same audio-stream implementation.

```text
                 MUSIC PROVIDERS
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    JioSaavn        YouTube           Local
       │               │                │
       ▼               ▼                ▼
 HTML5 Audio      YouTube Player    HTML5/Native
                                       Audio
```

This approach minimizes changes to the current working codebase and gives the new features their own clean boundaries.

---

# 42. Next Implementation Step

Before writing production code, create the following files/modules in this order:

```text
services/
├── youtubeService.server.js
├── youtubeService.js
└── favoritesService.js

app/api/youtube/search/
└── route.js

components/
├── YouTubeSearch.js
├── YouTubeResultCard.js
├── YouTubePlayer.js
└── UnifiedPlayer.js

hooks/
├── useYouTubeSearch.js
├── useFavorites.js
└── useUnifiedPlayer.js
```

Then create the Android/mobile project separately for:

```text
local music scanner
folder index
local database
local audio player
```

This keeps the current Next.js web application stable while the mobile-specific filesystem work is developed independently.
