@echo off
REM ==========================================
REM Distribution System - GitHub Push Script (Windows)
REM ==========================================

echo.
echo ============================================
echo   Distribution System - GitHub Push
echo ============================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo [33m Initializing Git repository...[0m
    git init
    echo [32m Git initialized[0m
)

REM Check for sensitive files
echo.
echo [33mChecking for sensitive files...[0m

if exist "backend\.env" (
    echo [31m WARNING: backend\.env found - This should NOT be committed![0m
)

if exist "desktop\.env" (
    echo [31m WARNING: desktop\.env found - This should NOT be committed![0m
)

if exist "backend\data\*.db" (
    echo [31m WARNING: Database files found - These should NOT be committed![0m
)

if exist "node_modules" (
    echo [33m INFO: node_modules found - Make sure it's in .gitignore[0m
)

REM Verify .gitignore exists
if not exist ".gitignore" (
    echo [31m ERROR: .gitignore file not found![0m
    echo [33m Create .gitignore before pushing to GitHub[0m
    pause
    exit /b 1
) else (
    echo [32m .gitignore found[0m
)

REM Verify example environment files exist
echo.
echo [33mChecking for example environment files...[0m

if exist "backend\.env.example" (
    echo [32m backend\.env.example found[0m
) else (
    echo [31m backend\.env.example missing[0m
)

if exist "desktop\.env.example" (
    echo [32m desktop\.env.example found[0m
) else (
    echo [31m desktop\.env.example missing[0m
)

REM Show git status
echo.
echo [33mCurrent Git Status:[0m
git status --short

echo.
echo ============================================
echo   IMPORTANT CHECKLIST
echo ============================================
echo   1. Created a GitHub repository
echo   2. Removed all sensitive data (.env files)
echo   3. Updated .env.example files
echo   4. Verified .gitignore is working
echo ============================================
echo.

set /p confirm="Continue with commit? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo [33mAborted. No changes were committed.[0m
    pause
    exit /b 0
)

REM Add all files
echo.
echo [33mAdding files to Git...[0m
git add .

REM Get commit message
echo.
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Production-ready: Distribution Management System

REM Commit
echo.
echo [33mCommitting changes...[0m
git commit -m "%commit_msg%"

REM Check if remote exists
git remote | findstr "origin" >nul 2>&1
if %errorlevel% equ 0 (
    echo [32mRemote 'origin' found[0m
    
    set /p push_confirm="Push to origin? (Y/N): "
    if /i "%push_confirm%"=="Y" (
        echo.
        echo [33mPushing to GitHub...[0m
        for /f %%i in ('git branch --show-current') do set BRANCH=%%i
        git push -u origin %BRANCH%
        
        echo.
        echo [32m========================================[0m
        echo [32m  Successfully pushed to GitHub![0m
        echo [32m========================================[0m
    )
) else (
    echo [33mNo remote repository configured[0m
    echo.
    echo [33mTo push to GitHub, run these commands:[0m
    echo    git remote add origin https://github.com/yourusername/distribution_system.git
    echo    git branch -M main
    echo    git push -u origin main
)

echo.
echo [32mDone![0m
echo.
echo [33mNext steps:[0m
echo    1. Go to your GitHub repository
echo    2. Verify no sensitive files were committed
echo    3. Follow PRODUCTION_DEPLOYMENT.md to deploy to server
echo.

pause
