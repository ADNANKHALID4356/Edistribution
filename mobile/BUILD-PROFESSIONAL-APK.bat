@echo off
title Distribution System - Professional APK Builder
color 0A

echo.
echo ========================================
echo  DISTRIBUTION SYSTEM - APK BUILDER
echo  Professional Mobile Application
echo ========================================
echo.

cd /d %~dp0

echo [STEP 1] Checking configuration...
echo.
echo API Configuration:
type "src\services\api.js" | findstr "API_BASE_URL"
echo.

echo [STEP 2] Build Method Selection
echo.
echo Choose build method:
echo.
echo 1. EAS Build (Recommended - Cloud, Professional)
echo    - No Android Studio needed
echo    - Fast and reliable
echo    - Like your EXE installer
echo.
echo 2. Local Build (Requires Android Studio)
echo    - Needs Android SDK installed
echo    - Build locally on your PC
echo.
echo 3. View Build Guide
echo    - Complete documentation
echo.

set /p choice="Enter choice (1/2/3): "

if "%choice%"=="1" goto EAS_BUILD
if "%choice%"=="2" goto LOCAL_BUILD
if "%choice%"=="3" goto VIEW_GUIDE
goto END

:EAS_BUILD
echo.
echo ========================================
echo  EAS BUILD (Cloud - Professional)
echo ========================================
echo.
echo This will build APK in Expo cloud servers.
echo Similar to how your EXE installer was built.
echo.
echo Requirements:
echo  - Expo account (free, create at expo.dev)
echo  - Internet connection
echo.
echo Steps:
echo  1. Login to Expo (one-time)
echo  2. Start build (10-15 minutes)
echo  3. Download APK from provided link
echo.
pause

echo.
echo [1/2] Checking EAS CLI...
call npx eas-cli --version >nul 2>&1
if errorlevel 1 (
    echo Installing EAS CLI...
    call npm install -g eas-cli
)
echo EAS CLI ready!

echo.
echo [2/2] Starting build...
echo.
echo ** You may need to login to Expo **
echo    Use: npx eas-cli login
echo.

call npx eas-cli build --platform android --profile preview

echo.
if errorlevel 0 (
    echo ========================================
    echo  BUILD SUBMITTED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Next Steps:
    echo  1. Wait 10-15 minutes for build to complete
    echo  2. Download APK from the link provided above
    echo  3. Share APK file with users
    echo.
    echo The APK will work like your EXE installer:
    echo  - Users install on phone
    echo  - App icon appears
    echo  - Tap to launch
    echo  - Login and use!
    echo.
) else (
    echo.
    echo ========================================
    echo  BUILD FAILED or LOGIN NEEDED
    echo ========================================
    echo.
    echo If you need to login:
    echo  npx eas-cli login
    echo.
    echo Then run this script again.
    echo.
)
goto END

:LOCAL_BUILD
echo.
echo ========================================
echo  LOCAL BUILD (Android Studio Required)
echo ========================================
echo.

if not defined ANDROID_HOME (
    echo ERROR: Android Studio not configured!
    echo.
    echo You need to:
    echo  1. Install Android Studio
    echo  2. Set ANDROID_HOME environment variable
    echo  3. Run this script again
    echo.
    echo For detailed instructions, see: MOBILE_APK_PROFESSIONAL_GUIDE.md
    echo.
    echo TIP: Use EAS Build instead (Option 1) - No Android Studio needed!
    echo.
    pause
    goto END
)

echo Android SDK Found: %ANDROID_HOME%
echo.
echo Building APK locally...
echo.

cd android
call gradlew assembleRelease

if errorlevel 0 (
    echo.
    echo ========================================
    echo  BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location:
    echo  %CD%\app\build\outputs\apk\release\app-release.apk
    echo.
    echo Next Steps:
    echo  1. Copy APK to desktop
    echo  2. Rename to: Distribution-System-v1.0.apk
    echo  3. Share with users
    echo.
    start explorer /select,"%CD%\app\build\outputs\apk\release\app-release.apk"
) else (
    echo.
    echo BUILD FAILED!
    echo Check errors above.
    echo.
    echo Consider using EAS Build (Option 1) instead.
    echo.
)

cd ..
goto END

:VIEW_GUIDE
echo.
echo Opening build guide...
start notepad "..\MOBILE_APK_PROFESSIONAL_GUIDE.md"
goto END

:END
echo.
echo ========================================
echo.
pause
