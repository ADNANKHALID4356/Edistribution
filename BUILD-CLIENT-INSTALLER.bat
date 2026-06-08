@echo off

title Build Client Installer EXE

setlocal

cd /d "%~dp0"



echo ============================================================

echo   Distribution System - VPS Client Installer Build

echo   API: http://147.93.108.205:5001/api

echo ============================================================

echo.

echo Output: desktop\dist-standalone\Distribution Management System-Setup-1.0.1.exe

echo Close Chrome, Cursor, and extra Node apps before continuing.

echo.



for /f "tokens=*" %%v in ('node -v 2^>nul') do (

  echo Node: %%v

  echo %%v| findstr /R "v24 v25 v26" >nul && (

    echo ERROR: Use Node 22 LTS from https://nodejs.org

    pause

    exit /b 1

  )

)



set NODE_OPTIONS=--max-old-space-size=12288

set GENERATE_SOURCEMAP=false

set DISABLE_ESLINT_PLUGIN=true

set CI=true

set CSC_IDENTITY_AUTO_DISCOVERY=false

set ELECTRON_BUILDER_NO_NATIVE_REBUILD=true



echo [1/3] Building desktop UI (5-20 minutes)...

cd /d "%~dp0desktop"

if not exist node_modules (

  echo Installing desktop dependencies...

  call npm.cmd install

  if errorlevel 1 goto :error

)

call npm.cmd run build:prod

if errorlevel 1 goto :error

call node scripts\preflight-check.js

if errorlevel 1 goto :error

echo OK: desktop\build\index.html



echo.

echo [2/3] Packaging Windows installer (NSIS)...

taskkill /F /IM electron.exe >nul 2>&1

if exist dist-standalone rmdir /s /q dist-standalone

set ELECTRON_DIST=%~dp0desktop\node_modules\electron\dist

if exist "%ELECTRON_DIST%\electron.exe" (

  echo Using local Electron runtime (offline-friendly)...

  call npx electron-builder --win nsis --config.directories.output=dist-standalone --config.electronDist="%ELECTRON_DIST%" --config.win.signAndEditExecutable=false --config.win.forceCodeSigning=false

) else (

  echo Local Electron runtime not found. Using online download...

  call npx electron-builder --win nsis --config.directories.output=dist-standalone --config.win.signAndEditExecutable=false --config.win.forceCodeSigning=false

)

if errorlevel 1 goto :error



echo.

echo [3/3] Creating release package...

set RELEASE_DIR=%~dp0CLIENT-RELEASE-v1.0.1

if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

for %%F in ("%~dp0desktop\dist-standalone\*.exe") do (

  copy /Y "%%F" "%RELEASE_DIR%\" >nul

  certutil -hashfile "%%F" SHA256 > "%RELEASE_DIR%\CHECKSUM-SHA256.txt"

  echo File: %%~nxF>> "%RELEASE_DIR%\CHECKSUM-SHA256.txt"

  echo Built: %date% %time%>> "%RELEASE_DIR%\CHECKSUM-SHA256.txt"

  echo API: http://147.93.108.205:5001/api>> "%RELEASE_DIR%\CHECKSUM-SHA256.txt"

)

copy /Y "%~dp0desktop\CLIENT-INSTALL-GUIDE.txt" "%RELEASE_DIR%\" >nul 2>&1

if not exist "%RELEASE_DIR%\CLIENT-INSTALL-GUIDE.txt" copy /Y "%~dp0CLIENT-RELEASE-v1.0.1\CLIENT-INSTALL-GUIDE.txt" "%RELEASE_DIR%\" >nul 2>&1



echo.

echo BUILD COMPLETE

echo ============================================================

dir /b "%~dp0desktop\dist-standalone\*.exe" 2>nul

echo.

echo Release folder: CLIENT-RELEASE-v1.0.1\

echo Server: http://147.93.108.205:5001/api

echo Login: admin / admin123

echo ============================================================

pause

exit /b 0



:error

echo.

echo BUILD FAILED. Close heavy apps, reboot if UI build ran out of memory, then run this file again.

pause

exit /b 1

