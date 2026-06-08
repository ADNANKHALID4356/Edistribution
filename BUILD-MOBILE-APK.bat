@echo off
title Distribution System - Mobile APK Builder (VPS)
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Distribution System - Professional APK Build
echo   API: http://147.93.108.205:5005/api
echo   Health: http://147.93.108.205:5005/api/health
echo ============================================================
echo.
echo Output: MOBILE-RELEASE-v1.0.1\Distribution-System-v1.0.1.apk
echo.

for /f "tokens=*" %%v in ('node -v 2^>nul') do (
  echo Node: %%v
  echo %%v| findstr /R "v24 v25 v26" >nul && (
    echo ERROR: Use Node 22 LTS from https://nodejs.org
    pause
    exit /b 1
  )
)

cd /d "%~dp0mobile"
if not exist node_modules (
  echo Installing mobile dependencies...
  call npm.cmd install
  if errorlevel 1 goto :error
)

echo.
echo [1/2] Verifying VPS API configuration...
findstr /C:"147.93.108.205" "src\utils\serverConfig.js" >nul || (
  echo ERROR: serverConfig.js is not set to VPS 147.93.108.205:5005
  goto :error
)
findstr /C:"5005" "src\utils\serverConfig.js" >nul || (
  echo ERROR: serverConfig.js port must be 5005
  goto :error
)
echo OK: API pre-configured for VPS port 5005

echo.
echo [2/2] Building APK via Expo EAS (cloud)...
echo.
call npx eas-cli whoami >nul 2>&1
if errorlevel 1 (
  echo You must login to Expo first (free account at https://expo.dev):
  echo   cd mobile
  echo   npx eas-cli login
  echo.
  echo Then run this script again.
  echo.
  echo ALTERNATIVE - Test immediately with Expo Go:
  echo   Double-click mobile\START-EXPO-VPS.bat
  pause
  exit /b 1
)

set EAS_NO_VCS=1
call npx eas-cli build --platform android --profile preview --non-interactive
if errorlevel 1 goto :error

echo.
echo [3/3] Preparing release folder...
set RELEASE_DIR=%~dp0MOBILE-RELEASE-v1.0.1
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

echo.
echo ============================================================
echo   BUILD SUBMITTED TO EAS CLOUD
echo ============================================================
echo.
echo   1. Wait 10-15 minutes for the build to finish
echo   2. Download APK from the link shown above or https://expo.dev
echo   3. Copy APK to: MOBILE-RELEASE-v1.0.1\
echo   4. Rename to: Distribution-System-v1.0.1.apk
echo.
echo   API: http://147.93.108.205:5005/api
echo   Login: salesman credentials from your system
echo ============================================================
pause
exit /b 0

:error
echo.
echo BUILD FAILED. See errors above.
echo.
echo Quick test without APK: run mobile\START-EXPO-VPS.bat
pause
exit /b 1
