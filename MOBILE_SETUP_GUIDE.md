# Mobile App Setup Guide - Vibe Coding Music Player

This guide walks you through building an Android APK from the Next.js web app using **Capacitor**.

## Prerequisites

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | 20+ | `winget install OpenJS.NodeJS` |
| Java JDK | 17+ | `winget install Microsoft.OpenJDK.17` |
| Android Studio | Latest | `winget install Google.AndroidStudio` |
| Git | Latest | `winget install Git.Git` |

---

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd C:\Users\Rishi\Desktop\vibe-coding-music-player
npm install
```

### 2. Initialize Capacitor (first time only)
```bash
npm run cap:init
# App name: Vibe Coding Music Player
# App ID: com.vibecoding.musicplayer
```

### 3. Add Android Platform
```bash
npm run cap:add:android
```

### 4. Build & Sync
```bash
npm run mobile:build
# This runs: next build + npx cap sync android
```

### 5. Open in Android Studio
```bash
npm run cap:open:android
```

### 6. Build APK in Android Studio
1. Wait for Gradle sync to complete
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Two Deployment Strategies

### Option A: Hosted Backend (Recommended) 🌐
**Best for:** Production apps, easiest setup, all features work

1. **Deploy to Vercel:**
   ```bash
   npx vercel --prod
   ```
   Or push to GitHub and connect to Vercel dashboard.

2. **Update `capacitor.config.ts`:**
   ```typescript
   server: {
     url: 'https://your-app.vercel.app',  // Your Vercel URL
     cleartext: false,
   }
   ```

3. **Rebuild & Sync:**
   ```bash
   npm run mobile:build
   ```

4. **Build APK** in Android Studio (Step 6 above)

✅ **Pros:** All API routes work, JioSaavn server-side, no CORS issues
❌ **Cons:** Requires internet connection

---

### Option B: Client-Side Only (Offline-Capable) 📱
**Best for:** Offline-first, no server costs, direct JioSaavn calls

The code is **already configured** for this! The `musicService.mobile.js` detects Capacitor and uses native HTTP to call JioSaavn directly (bypassing CORS).

1. **Enable static export** in `next.config.mjs`:
   ```javascript
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: { unoptimized: true },
   };
   ```

2. **Update `capacitor.config.ts`:**
   ```typescript
   webDir: 'out',
   server: {
     cleartext: true,  // For local dev only
   }
   ```

3. **Build & Sync:**
   ```bash
   npm run mobile:build
   ```

4. **Build APK** in Android Studio

✅ **Pros:** Works offline (cached tracks), no server needed, smaller deployment
❌ **Cons:** JioSaavn API changes break app, no server-side caching

---

## Development Workflow

### Live Reload on Device
```bash
# 1. Start Next.js dev server
npm run dev

# 2. Find your local IP
ipconfig | findstr IPv4
# Example: 192.168.1.42

# 3. Update capacitor.config.ts temporarily
server: {
  url: 'http://192.168.1.42:3001',
  cleartext: true,
}

# 4. Run on device with live reload
npm run cap:run:android:dev
```

### Build Release APK
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Build App Bundle (for Play Store)
```bash
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Project Structure After Setup

```
vibe-coding-music-player/
├── android/                    # Native Android project (generated)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/vibecoding/musicplayer/
│   │   │   │   └── MainActivity.java
│   │   │   ├── res/
│   │   │   │   ├── values/colors.xml, strings.xml, styles.xml
│   │   │   │   ├── drawable/splash_screen.xml
│   │   │   │   └── xml/network_security_config.xml
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle.properties
├── capacitor.config.ts         # Capacitor configuration
├── services/
│   ├── musicService.js         # Web: calls /api/tracks
│   └── musicService.mobile.js  # Universal: Capacitor HTTP on mobile
└── hooks/useMusicQueue.js      # Uses musicService.mobile.js
```

---

## Key Files Modified for Mobile

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | App ID, plugins, Android config |
| `services/musicService.mobile.js` | Dual-mode: API route (web) / Capacitor HTTP (mobile) |
| `hooks/useMusicQueue.js` | Uses universal music service |
| `app/page.js` | Hides splash screen on native |
| `android/app/src/main/AndroidManifest.xml` | Permissions: audio, internet, foreground service |
| `android/app/src/main/res/xml/network_security_config.xml` | Cleartext for dev, HTTPS for prod |

---

## Capacitor Plugins Used

| Plugin | Purpose |
|--------|---------|
| `@capacitor/core` | Core runtime |
| `@capacitor/android` | Android platform |
| `@capacitor/http` | Native HTTP (bypasses CORS for JioSaavn) |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/keyboard` | Keyboard handling |
| `@capacitor/splash-screen` | Branded launch screen |
| `@capacitor/status-bar` | Status bar styling |

---

## Troubleshooting

### Gradle Sync Fails
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
```

### "Cleartext HTTP traffic not permitted"
- Check `network_security_config.xml` includes your dev IP
- Or use `https://` with a valid cert

### Audio Doesn't Play in Background
- Add `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission (already in manifest)
- Implement `MediaPlaybackService` for true background audio

### Capacitor Plugins Not Found
```bash
npm run mobile:build
# Re-syncs native plugins
```

### White Screen on Launch
- Check `capacitor.config.ts` `webDir` matches build output (`out` for static, `.next/server/app` for server)
- Check console logs in Android Studio Logcat

---

## Signing Release APK

### Generate Keystore
```bash
keytool -genkey -v -keystore vibecoding-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vibecoding
```

### Configure Signing (`android/app/build.gradle`)
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../vibecoding-release-key.jks')
            storePassword 'your_keystore_password'
            keyAlias 'vibecoding'
            keyPassword 'your_key_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Build Signed Release
```bash
cd android
./gradlew assembleRelease
```

---

## Play Store Checklist

- [ ] App signed with release keystore
- [ ] Version code incremented in `build.gradle`
- [ ] Privacy policy URL (required for audio apps)
- [ ] App icons (all densities in `mipmap-*` folders)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone, 7-inch tablet, 10-inch tablet)
- [ ] Target API level 34+
- [ ] 64-bit support (enabled by default)
- [ ] Data safety form completed

---

## Useful Commands Reference

```bash
# Full rebuild
npm run mobile:build

# Open Android Studio
npm run cap:open:android

# Run on connected device (debug)
npm run cap:run:android

# Run with live reload
npm run cap:run:android:dev

# Build debug APK from CLI
cd android && ./gradlew assembleDebug

# Build release APK from CLI
cd android && ./gradlew assembleRelease

# Build App Bundle for Play Store
cd android && ./gradlew bundleRelease

# View device logs
adb logcat | findstr "VibeCoding\|Capacitor\|chromium"
```

---

## Support

- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Docs:** https://developer.android.com
- **Next.js Mobile:** https://nextjs.org/docs/app/building-your-application/deploying/static-exports

---

*Generated for Vibe Coding Music Player • Next.js 16 + Capacitor 6*