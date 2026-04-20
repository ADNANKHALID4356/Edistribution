@echo off
REM ========================================
REM Desktop App - Production Build Script (Windows)
REM ========================================

echo =========================================
echo Building Desktop App for Distribution
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18.x or newer
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo [OK] NPM version:
npm --version
echo.

REM Navigate to desktop directory
cd desktop

REM Install dependencies
echo [STEP 1/3] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

REM Build React application
echo.
echo [STEP 2/3] Building React application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] React build failed!
    pause
    exit /b 1
)

echo [OK] React build completed!
echo.

REM Package desktop app
echo [STEP 3/3] Packaging desktop application...
call npm run electron-build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b 1
)

echo.
echo =========================================
echo [SUCCESS] Build Completed Successfully!
echo =========================================
echo.
echo Built files are in: desktop\dist\
echo.
echo Distribution files:
echo   - Windows Installer: dist\*.exe
echo   - Portable Version: dist\win-unpacked\
echo.
echo Next steps:
echo 1. Test the installer before distribution
echo 2. Distribute to clients via:
echo    - Direct download
echo    - Email
echo    - Cloud storage
echo    - USB drives
echo.
pause
