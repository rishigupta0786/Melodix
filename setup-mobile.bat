@echo off
REM ============================================
REM Vibe Coding Music Player - Mobile Setup Script
REM ============================================

echo.
echo  _   _                 _ _     ____            _       
echo | \ | |_   _ _ __   __| | |   / ___| _ __   __| |_   _ 
echo |  \| | | | | '_ \ / _` | |   \___ \| '_ \ / _` | | | |
echo | |\  | |_| | | | | (_| | |___ ___) | | | | (_| | |_| |
echo |_| \_|\__,_|_| |_|\__,_|_____|____/|_| |_|\__,_|\__, |
echo                                                  |___/ 
echo.
echo Mobile App Setup for Android
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 20+ from https://nodejs.org
    echo Or run: winget install OpenJS.NodeJS
    pause
    exit /b 1
)

echo [OK] Node.js version: 
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found
    pause
    exit /b 1
)

echo [OK] npm version:
npm --version

echo.
echo ============================================
echo STEP 1: Installing dependencies...
echo ============================================
npm install

if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo STEP 2: Initializing Capacitor...
echo ============================================
npx cap init "Vibe Coding Music Player" "com.vibecoding.musicplayer" --web-dir=out

if %errorlevel% neq 0 (
    echo [ERROR] Capacitor init failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo STEP 3: Adding Android platform...
echo ============================================
npx cap add android

if %errorlevel% neq 0 (
    echo [ERROR] Capacitor add android failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo STEP 4: Building web app & syncing...
echo ============================================
npm run build
npx cap sync android

if %errorlevel% neq 0 (
    echo [ERROR] Build or sync failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS! Setup complete!
echo ============================================
echo.
echo Next steps:
echo 1. Open Android Studio:  npx cap open android
echo 2. Wait for Gradle sync
echo 3. Build APK: Build > Build Bundle(s)/APK(s) > Build APK(s)
echo 4. Find APK at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo For development with live reload:
echo   npm run dev
echo   npm run cap:run:android:dev
echo.
echo Read MOBILE_SETUP_GUIDE.md for detailed instructions.
echo.
pause