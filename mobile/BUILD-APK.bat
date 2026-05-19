@echo off
title Distribution System - Mobile APK Builder
color 0A

echo ========================================
echo  Distribution System Mobile APK Builder
echo  Ummahtechinnovations
echo ========================================
echo.

echo Checking build environment...
echo.

REM Check if Android SDK is installed
if defined ANDROID_HOME (
    echo [OK] Android SDK found: %ANDROID_HOME%
    goto :LOCAL_BUILD
) else (
    echo [!] Android SDK not configured
    echo.
    goto :EAS_BUILD
)

:LOCAL_BUILD
echo ========================================
echo  LOCAL BUILD (Using Android SDK)
echo ========================================
echo.
echo This will build APK using local Android Studio...
echo.
pause

cd /d c:\distribution\distribution_system\mobile\android
echo Building APK...
call gradlew.bat assembleRelease

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location:
    echo %CD%\app\build\outputs\apk\release\app-release.apk
    echo.
    explorer /select,"%CD%\app\build\outputs\apk\release\app-release.apk"
) else (
    echo.
    echo BUILD FAILED!
    echo Check errors above.
)
goto :END

:EAS_BUILD
echo ========================================
echo  RECOMMENDED: EAS BUILD (Cloud)
echo ========================================
echo.
echo Android SDK not found locally.
echo.
echo For easiest APK build, use Expo EAS Build (cloud):
echo.
echo 1. Install EAS CLI:
echo    npm install -g eas-cli
echo.
echo 2. Login to Expo:
echo    eas login
echo.
echo 3. Build APK:
echo    cd c:\distribution\distribution_system\mobile
echo    eas build --platform android --profile preview
echo.
echo 4. Download APK from link provided
echo.
echo ========================================
echo.
echo Would you like to start EAS build now? (y/n)
set /p choice="Enter choice: "

if /i "%choice%"=="y" (
    echo.
    echo Installing EAS CLI...
    npm install -g eas-cli
    
    echo.
    echo Starting EAS build...
    cd /d c:\distribution\distribution_system\mobile
    eas build --platform android --profile preview
) else (
    echo.
    echo Skipped. You can run EAS build manually later.
    echo See APK_BUILD_GUIDE.md for instructions.
)

:END
echo.
echo ========================================
pause
