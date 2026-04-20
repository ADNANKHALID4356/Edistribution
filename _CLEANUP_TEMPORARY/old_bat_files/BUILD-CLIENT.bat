@echo off
echo.
echo ========================================================================
echo    Building Client-Only Distribution Management System
echo    Connects to VPS: 147.93.108.205:5001
echo ========================================================================
echo.

REM Step 1: Build React App
echo.
echo [1/3] Building React frontend application...
echo ----------------------------------------
cd desktop
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: React build failed!
    pause
    exit /b 1
)
echo ✓ React frontend built successfully
echo.

REM Step 2: Copy electron-client.js
echo.
echo [2/3] Preparing Electron launcher...
echo ----------------------------------------
copy /Y public\electron-client.js build\electron-client.js >nul
echo ✓ Electron launcher prepared
echo.

REM Step 3: Build the installer, portable, and zip
echo.
echo [3/3] Building Windows packages (Installer + Portable + ZIP)...
echo ----------------------------------------
call npx electron-builder build --win --config electron-builder-client.json
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Package build failed!
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo    BUILD COMPLETED SUCCESSFULLY!
echo ========================================================================
echo.
echo Output location: desktop\dist-client\
echo.
echo Files created:
echo   1. Distribution Management System-Client-0.1.0.exe (Installer)
echo   2. Distribution Management System-Portable-0.1.0.exe (Portable)
echo   3. Distribution Management System-Client-0.1.0-win.zip (ZIP)
echo.
echo NOTE: This is a client-only app that connects to:
echo       http://147.93.108.205:5001/api
echo.
echo Make sure your VPS backend is running!
echo.
pause
