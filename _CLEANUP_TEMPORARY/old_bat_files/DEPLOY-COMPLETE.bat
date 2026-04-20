@echo off
REM ====================================================
REM   COMPLETE DEPLOYMENT SCRIPT
REM   From Local → GitHub → Production
REM ====================================================

color 0A
echo.
echo ====================================================
echo   Distribution System - Complete Deployment
echo ====================================================
echo.

REM Step 1: Verify Deployment Readiness
echo [33m[STEP 1/5] Verifying deployment readiness...[0m
echo.
node verify-deployment-ready.js
if %errorlevel% neq 0 (
    echo.
    echo [31mVerification found warnings.[0m
    echo [33mThis is normal if you have .env files locally - they won't be pushed.[0m
    echo.
    choice /C YN /M "Continue anyway (Y=Yes, N=No)"
    if errorlevel 2 exit /b 1
)

echo.
echo [32m✓ Verification complete[0m
echo.
pause

REM Step 2: Prepare for GitHub
echo.
echo ====================================================
echo [33m[STEP 2/5] Preparing for GitHub...[0m
echo ====================================================
echo.

call prepare-for-github.bat

echo.
echo [32m✓ Preparation complete[0m
echo.
pause

REM Step 3: Initialize Git (if needed)
echo.
echo ====================================================
echo [33m[STEP 3/5] Setting up Git repository...[0m
echo ====================================================
echo.

if not exist ".git" (
    echo [33mInitializing Git repository...[0m
    git init
    echo.
    echo [32m✓ Git initialized[0m
) else (
    echo [32m✓ Git already initialized[0m
)

echo.
echo [33mConfiguring Git (if not already done)...[0m
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    set /p GIT_NAME="Enter your name: "
    git config --global user.name "%GIT_NAME%"
)

git config user.email >nul 2>&1
if %errorlevel% neq 0 (
    set /p GIT_EMAIL="Enter your email: "
    git config --global user.email "%GIT_EMAIL%"
)

echo.
echo [32m✓ Git configured[0m
echo.
pause

REM Step 4: Push to GitHub
echo.
echo ====================================================
echo [33m[STEP 4/5] Pushing to GitHub...[0m
echo ====================================================
echo.

echo [33mIMPORTANT: You need to create a GitHub repository first![0m
echo.
echo Go to: https://github.com/new
echo   - Name: distribution-system
echo   - Visibility: Private
echo   - Do NOT initialize with README
echo.

choice /C YN /M "Have you created the GitHub repository (Y=Yes, N=No)"
if errorlevel 2 (
    echo.
    echo [31mPlease create the repository on GitHub first, then run this script again.[0m
    pause
    exit /b 1
)

echo.
set /p REPO_URL="Enter your GitHub repository URL (e.g., https://github.com/username/distribution-system.git): "

if "%REPO_URL%"=="" (
    echo [31mRepository URL is required![0m
    pause
    exit /b 1
)

echo.
echo [33mAdding files to Git...[0m
git add .
if %errorlevel% neq 0 (
    echo [31mFailed to add files![0m
    pause
    exit /b 1
)

echo.
echo [33mCreating commit...[0m
git commit -m "Initial commit - Distribution Management System v1.0.0"
if %errorlevel% neq 0 (
    echo [33mNothing to commit or commit failed. Checking status...[0m
    git status
)

echo.
echo [33mAdding remote repository...[0m
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
if %errorlevel% neq 0 (
    echo [31mFailed to add remote![0m
    pause
    exit /b 1
)

echo.
echo [33mPushing to GitHub...[0m
git branch -M main
git push -u origin main --force
if %errorlevel% neq 0 (
    echo [31mFailed to push to GitHub![0m
    echo.
    echo [33mPossible issues:[0m
    echo   - Incorrect repository URL
    echo   - Not authenticated (need GitHub token or SSH key)
    echo   - Repository doesn't exist
    echo.
    echo [33mTry these:[0m
    echo   1. Verify repository exists on GitHub
    echo   2. Check repository URL
    echo   3. Setup GitHub authentication:
    echo      https://docs.github.com/en/authentication
    echo.
    pause
    exit /b 1
)

echo.
echo [32m✓ Successfully pushed to GitHub![0m
echo.
pause

REM Step 5: Post-Push Verification
echo.
echo ====================================================
echo [33m[STEP 5/5] Post-Push Verification[0m
echo ====================================================
echo.

echo [33mPlease verify on GitHub:[0m
echo.
echo [32m✓ Check these files ARE visible:[0m
echo   - backend/.env.example
echo   - desktop/.env.example
echo   - .gitignore
echo   - README.md
echo   - PRODUCTION_DEPLOYMENT.md
echo   - QUICK_START.md
echo.
echo [31m✓ Check these files are NOT visible:[0m
echo   - backend/.env
echo   - backend/data/*.db
echo   - node_modules/
echo.

echo Visit your repository: %REPO_URL:~0,-4%
echo.

choice /C YN /M "Did verification pass on GitHub (Y=Yes, N=No)"
if errorlevel 2 (
    echo.
    echo [31mVerification failed![0m
    echo.
    echo [33mIf sensitive files are visible:[0m
    echo   1. Run: git rm --cached backend/.env
    echo   2. Run: git commit -m "Remove sensitive files"
    echo   3. Run: git push origin main --force
    echo   4. Change all exposed passwords immediately
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo [32m   DEPLOYMENT TO GITHUB COMPLETE![0m
echo ====================================================
echo.

echo [32m✓ Code successfully pushed to GitHub[0m
echo [32m✓ No sensitive files exposed[0m
echo [32m✓ Ready for production deployment[0m
echo.

echo [33mNEXT STEPS:[0m
echo.
echo 1. [33mREAD:[0m PRODUCTION_DEPLOYMENT.md
echo    Full step-by-step guide for server deployment
echo.
echo 2. [33mQUICK START:[0m QUICK_START.md
echo    User-friendly deployment guide
echo.
echo 3. [33mDEPLOY TO SERVER:[0m
echo    - Get Ubuntu server (2GB RAM, 20GB storage)
echo    - Install Node.js, MySQL, Nginx
echo    - Clone from GitHub
echo    - Follow PRODUCTION_DEPLOYMENT.md
echo.
echo 4. [33mTEST PRODUCTION:[0m
echo    - Test API: curl https://api.yourdomain.com/api/health
echo    - Test web: https://yourdomain.com
echo    - Login: admin / admin123 (change immediately!)
echo.
echo 5. [33mGIVE ACCESS TO CLIENTS:[0m
echo    - Provide URL and credentials
echo    - Share QUICK_START.md user guide
echo    - Optional: Build and distribute desktop app
echo.

echo [32mProduction JWT Secret (save this for server .env):[0m
echo f955e7ac5158717551bf7f9e541688f0c1660f54c769d0fe142a3f0a631de67b
echo.

echo [33mEstimated deployment time:[0m
echo   - First time: 2-4 hours
echo   - Updates: 10-15 minutes
echo.

echo ====================================================
echo [32m   CONGRATULATIONS! YOU'RE READY FOR PRODUCTION![0m
echo ====================================================
echo.

pause
