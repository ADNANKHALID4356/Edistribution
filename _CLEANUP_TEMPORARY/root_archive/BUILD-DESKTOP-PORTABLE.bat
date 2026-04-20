@echo off
title Build Desktop Portable - Distribution System
color 0B

echo.
echo ========================================================================
echo    BUILDING DESKTOP PORTABLE VERSION
echo ========================================================================
echo.
echo This will create a portable .exe (no installer required)
echo.

cd /d "%~dp0desktop"

echo [1/4] Cleaning previous builds...
if exist dist-standalone rmdir /s /q dist-standalone
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo      Done!

echo.
echo [2/4] Checking if React build exists...
if not exist build (
    echo      Building React app...
    call npm run build
    if errorlevel 1 (
        echo ERROR: React build failed
        pause
        exit /b 1
    )
) else (
    echo      React build already exists, skipping...
)
echo      Done!

echo.
echo [3/4] Creating portable executable...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_CACHE=%TEMP%\electron-builder-cache

REM Build portable version (no signing required)
call npx electron-builder --win portable --config.directories.output=dist-standalone --config.win.signAndEditExecutable=false

if errorlevel 1 (
    echo ERROR: Portable build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Checking output...
if exist "dist-standalone\*.exe" (
    echo      Build successful!
) else (
    echo      WARNING: No .exe file found
)

echo.
echo ========================================================================
echo    BUILD COMPLETE!
echo ========================================================================
echo.
echo Portable app location: %CD%\dist-standalone\
echo.
dir /b dist-standalone\*.exe 2>nul
echo.
echo This portable .exe can run on any Windows computer without installation.
echo Just copy and run it directly.
echo.
pause
