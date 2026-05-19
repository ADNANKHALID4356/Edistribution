@echo off
title Check APK Build Status
color 0E

:CHECK
cls
echo.
echo ========================================
echo   CHECKING APK BUILD STATUS
echo ========================================
echo.
echo APK Location: android\app\build\outputs\apk\release\
echo.

cd /d "%~dp0android\app\build\outputs\apk\release"

if exist "app-release.apk" (
    echo [SUCCESS] APK FOUND!
    echo.
    dir app-release.apk
    echo.
    echo ========================================
    echo   APK IS READY!
    echo ========================================
    echo.
    echo Location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo You can now:
    echo 1. Transfer this APK to your Android phone
    echo 2. Install it
    echo 3. Test with VPS backend: http://147.93.108.205:5001
    echo.
    pause
    exit
) else (
    echo [INFO] APK not found yet - Build still in progress...
    echo.
    echo Build typically takes 5-10 minutes for first build.
    echo Subsequent builds are faster.
    echo.
    echo Waiting 30 seconds before checking again...
    timeout /t 30 /nobreak > nul
    goto CHECK
)
