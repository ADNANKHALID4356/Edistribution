@echo off
title Build Desktop & Mobile - Distribution System
color 0B

echo.
echo ========================================================================
echo    BUILDING DISTRIBUTION MANAGEMENT SYSTEM
echo ========================================================================
echo.
echo This script will build:
echo   1. Desktop App (Windows Installer .exe)
echo   2. Mobile App (Android APK)
echo.
pause

REM ============================================================================
REM PART 1: BUILD DESKTOP INSTALLER
REM ============================================================================

echo.
echo ========================================================================
echo    PART 1: BUILDING DESKTOP WINDOWS INSTALLER
echo ========================================================================
echo.

cd /d "%~dp0desktop"

echo [1/4] Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist-standalone rmdir /s /q dist-standalone
echo      Done!

echo.
echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo      Done!

echo.
echo [3/4] Building React app (this may take 2-3 minutes)...
call npm run build
if errorlevel 1 (
    echo ERROR: React build failed
    pause
    exit /b 1
)
echo      Done!

echo.
echo [4/4] Creating Windows installer...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_NO_NATIVE_REBUILD=true
call npx electron-builder --win nsis --config.directories.output=dist-standalone
if errorlevel 1 (
    echo ERROR: Installer build failed
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo    DESKTOP INSTALLER BUILD COMPLETE!
echo ========================================================================
echo.
echo Installer location:
echo    %CD%\dist-standalone\
echo.
echo Files created:
dir /b dist-standalone\*.exe 2>nul
echo.

REM ============================================================================
REM PART 2: BUILD MOBILE APK
REM ============================================================================

echo.
echo ========================================================================
echo    PART 2: BUILDING MOBILE APK
echo ========================================================================
echo.
echo The APK will be built using Expo EAS Build (cloud service).
echo This requires an Expo account (free).
echo.
pause

cd /d "%~dp0mobile"

echo [1/3] Checking EAS CLI...
call npx eas-cli --version >nul 2>&1
if errorlevel 1 (
    echo Installing EAS CLI...
    call npm install -g eas-cli
)
echo      Done!

echo.
echo [2/3] Checking Expo login status...
call npx eas-cli whoami
if errorlevel 1 (
    echo.
    echo ========================================================================
    echo    EXPO LOGIN REQUIRED
    echo ========================================================================
    echo.
    echo Please login to Expo to continue:
    echo.
    call npx eas-cli login
    if errorlevel 1 (
        echo.
        echo ERROR: Login failed. Cannot build APK without Expo account.
        echo.
        echo Create free account at: https://expo.dev
        echo.
        pause
        exit /b 1
    )
)
echo      Done!

echo.
echo [3/3] Starting APK build (cloud build, takes 10-15 minutes)...
echo.
call npx eas-cli build --platform android --profile preview --non-interactive

if errorlevel 0 (
    echo.
    echo ========================================================================
    echo    APK BUILD SUBMITTED TO CLOUD!
    echo ========================================================================
    echo.
    echo Your APK is being built on Expo servers.
    echo Build time: approximately 10-15 minutes
    echo.
    echo You will receive:
    echo   - Email notification when build completes
    echo   - Download link for the APK file
    echo.
    echo Check build status at: https://expo.dev
    echo.
) else (
    echo.
    echo ========================================================================
    echo    APK BUILD FAILED!
    echo ========================================================================
    echo.
    echo Please check the error messages above.
    echo.
)

echo.
echo ========================================================================
echo    BUILD PROCESS COMPLETE
echo ========================================================================
echo.
echo DESKTOP INSTALLER:
echo    Location: desktop\dist-standalone\
echo    File: Distribution Management System-Setup-1.0.0.exe
echo.
echo MOBILE APK:
echo    Status: Building in Expo cloud
echo    Check: https://expo.dev
echo.
pause
