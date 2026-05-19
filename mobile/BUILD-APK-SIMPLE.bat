@echo off
title Build APK - Distribution System
color 0A

echo.
echo ========================================================================
echo    BUILDING APK FOR DISTRIBUTION SYSTEM
echo ========================================================================
echo.
echo This will build the mobile app APK using EAS Build (Expo Cloud).
echo.
echo IMPORTANT: You need to:
echo   1. Have an Expo account (free at https://expo.dev)
echo   2. Be logged in (will prompt if not logged in)
echo.
echo The build takes about 10-15 minutes in the cloud.
echo You'll get a download link for the APK when done.
echo.
echo API Configuration: http://147.93.108.205:5001/api (VPS Backend)
echo.
pause

echo.
echo [1/3] Checking EAS CLI...
call npx eas-cli --version >nul 2>&1
if errorlevel 1 (
    echo Installing EAS CLI...
    call npm install -g eas-cli
) else (
    echo EAS CLI is ready!
)

echo.
echo [2/3] Checking login status...
call npx eas-cli whoami
if errorlevel 1 (
    echo.
    echo You need to login to Expo first.
    echo.
    echo Run this command in a new terminal:
    echo    npx eas-cli login
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting APK build...
echo.
echo Building with profile: preview (APK format)
echo Platform: Android
echo.

call npx eas-cli build --platform android --profile preview --non-interactive

echo.
if errorlevel 0 (
    echo ========================================================================
    echo    BUILD SUBMITTED SUCCESSFULLY!
    echo ========================================================================
    echo.
    echo Your APK is being built in the cloud!
    echo.
    echo NEXT STEPS:
    echo   1. Wait 10-15 minutes for the build to complete
    echo   2. Check your email or Expo dashboard for the download link
    echo   3. Download the APK file
    echo   4. Transfer to Android device and install
    echo.
    echo Alternative: Check build status at https://expo.dev
    echo.
) else (
    echo.
    echo ========================================================================
    echo    BUILD FAILED!
    echo ========================================================================
    echo.
    echo Please check the error messages above.
    echo.
    echo Common issues:
    echo   - Not logged in: Run "npx eas-cli login" first
    echo   - No internet connection
    echo   - Invalid configuration
    echo.
)

echo.
pause
