#!/usr/bin/env pwsh
# ============================================
# Vibe Coding Music Player - Mobile Setup Script (PowerShell)
# ============================================

Write-Host ""
Write-Host "  _   _                 _ _     ____            _       " -ForegroundColor Cyan
Write-Host " | \ | |_   _ _ __   __| | |   / ___| _ __   __| |_   _ " -ForegroundColor Cyan
Write-Host " |  \| | | | | '_ \ / _` | |   \___ \| '_ \ / _` | | | |" -ForegroundColor Cyan
Write-Host " | |\  | |_| | | | | (_| | |___ ___) | | | | (_| | |_| |" -ForegroundColor Cyan
Write-Host " |_| \_|\__,_|_| |_|\__,_|_____|____/|_| |_|\__,_|\__, |" -ForegroundColor Cyan
Write-Host "                                                  |___/ " -ForegroundColor Cyan
Write-Host ""
Write-Host " Mobile App Setup for Android" -ForegroundColor Green
Write-Host " ============================================" -ForegroundColor Green
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Write-Host "Or run: winget install OpenJS.NodeJS" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "STEP 1: Installing dependencies..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] npm install failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "STEP 2: Initializing Capacitor..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
npx cap init "Vibe Coding Music Player" "com.vibecoding.musicplayer" --web-dir=out
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Capacitor init failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "STEP 3: Adding Android platform..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
npx cap add android
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Capacitor add android failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "STEP 4: Building web app & syncing..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
npm run build
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Build or sync failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "SUCCESS! Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Android Studio:  npx cap open android"
Write-Host "2. Wait for Gradle sync"
Write-Host "3. Build APK: Build > Build Bundle(s)/APK(s) > Build APK(s)"
Write-Host "4. Find APK at: android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host ""
Write-Host "For development with live reload:" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host "  npm run cap:run:android:dev"
Write-Host ""
Write-Host "Read MOBILE_SETUP_GUIDE.md for detailed instructions."
Write-Host ""

Read-Host "Press Enter to exit"