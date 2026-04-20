@echo off
title Build Desktop Installer - Distribution System
color 0B

echo.
echo ========================================================================
echo    BUILDING DESKTOP WINDOWS INSTALLER
echo ========================================================================
echo.

cd /d "%~dp0desktop"

echo [1/4] Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist-standalone rmdir /s /q dist-standalone
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
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
    echo.
    echo TIP: Check for JavaScript/React errors in the code
    pause
    exit /b 1
)
echo     Done!

echo.
echo [4/4] Creating Windows installer...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_NO_NATIVE_REBUILD=true
set ELECTRON_BUILDER_CACHE=%TEMP%\electron-builder-cache

call npx electron-builder --win nsis --config.directories.output=dist-standalone --config.win.signAndEditExecutable=false

if errorlevel 1 (
    echo ERROR: Installer build failed
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo    BUILD COMPLETE!
echo ========================================================================
echo.
echo Installer location: %CD%\dist-standalone\
echo.
dir /b dist-standalone\*.exe 2>nul
echo.
echo You can now install the application on any Windows computer.
echo.
pause
