@echo off
echo.
echo ========================================================================
echo    Building Standalone Distribution Management System
echo ========================================================================
echo.

REM Step 1: Build React App
echo.
echo [1/6] Building React frontend application...
echo ----------------------------------------
cd desktop
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: React build failed!
    exit /b 1
)
echo ✓ React frontend built successfully
cd ..

REM Step 2: Build backend standalone executable
echo.
echo [2/6] Building backend standalone executable...
echo ----------------------------------------
cd backend
call npm run build-standalone
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Backend standalone build failed!
    exit /b 1
)
echo ✓ Backend executable created successfully
cd ..

REM Step 3: Verify backend executable exists
echo.
echo [3/6] Verifying backend executable...
echo ----------------------------------------
if not exist "desktop\backend-standalone\backend.exe" (
    echo.
    echo ERROR: Backend executable not found!
    exit /b 1
)
echo ✓ Backend executable verified

REM Step 4: Update Electron configuration
echo.
echo [4/6] Preparing Electron configuration...
echo ----------------------------------------
cd desktop
if not exist "electron.js.backup" (
    copy /Y electron.js electron.js.backup >nul
)
copy /Y electron-standalone.js electron.js >nul
echo ✓ Electron configuration updated

REM Step 5: Install/verify electron-builder
echo.
echo [5/6] Preparing electron-builder...
echo ----------------------------------------
call npm list electron-builder >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing electron-builder...
    call npm install electron-builder --save-dev
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install electron-builder
        exit /b 1
    )
)
echo ✓ electron-builder ready

REM Step 6: Build the standalone installer
echo.
echo [6/6] Building Windows installer...
echo ----------------------------------------
call npx electron-builder build --win --config package-standalone.json
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installer build failed!
    exit /b 1
)

REM Restore original electron.js
if exist "electron.js.backup" (
    copy /Y electron.js.backup electron.js >nul
    del electron.js.backup
)

echo.
echo ========================================================================
echo    BUILD COMPLETED SUCCESSFULLY!
echo ========================================================================
echo.
echo Installer location: desktop\dist-standalone\
echo File: Distribution Management System-Setup-1.0.0.exe
echo.
