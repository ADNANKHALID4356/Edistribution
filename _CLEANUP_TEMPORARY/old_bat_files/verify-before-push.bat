@echo off
REM ========================================
REM Pre-GitHub Push Verification Script
REM Checks for sensitive files before commit
REM ========================================

echo.
echo ========================================
echo Distribution System - GitHub Push Check
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Checking for .env files that should NOT be committed...
echo.

set "FOUND_ISSUE=0"

REM Check for .env files
if exist "backend\.env" (
    echo [X] CRITICAL: backend\.env exists
    git check-ignore backend\.env >nul 2>&1
    if errorlevel 1 (
        echo     [!] WARNING: backend\.env is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo     [OK] backend\.env is properly ignored
    )
) else (
    echo [OK] backend\.env does not exist
)

if exist "desktop\.env" (
    echo [X] CRITICAL: desktop\.env exists
    git check-ignore desktop\.env >nul 2>&1
    if errorlevel 1 (
        echo     [!] WARNING: desktop\.env is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo     [OK] desktop\.env is properly ignored
    )
) else (
    echo [OK] desktop\.env does not exist
)

echo.
echo [2/6] Checking for database files...
echo.

if exist "backend\data\*.db" (
    echo [X] Found .db files in backend\data\
    git check-ignore backend\data\*.db >nul 2>&1
    if errorlevel 1 (
        echo     [!] WARNING: Database files are NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo     [OK] Database files are properly ignored
    )
) else (
    echo [OK] No database files in backend\data\
)

if exist "backend\*.db" (
    echo [X] Found .db files in backend\
    git check-ignore backend\*.db >nul 2>&1
    if errorlevel 1 (
        echo     [!] WARNING: Database files are NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo     [OK] Database files are properly ignored
    )
) else (
    echo [OK] No database files in backend\
)

echo.
echo [3/6] Checking for node_modules...
echo.

if exist "backend\node_modules\" (
    git check-ignore backend\node_modules >nul 2>&1
    if errorlevel 1 (
        echo [!] WARNING: backend\node_modules is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo [OK] backend\node_modules is properly ignored
    )
)

if exist "desktop\node_modules\" (
    git check-ignore desktop\node_modules >nul 2>&1
    if errorlevel 1 (
        echo [!] WARNING: desktop\node_modules is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo [OK] desktop\node_modules is properly ignored
    )
)

echo.
echo [4/6] Checking for build outputs...
echo.

if exist "desktop\dist\" (
    git check-ignore desktop\dist >nul 2>&1
    if errorlevel 1 (
        echo [!] WARNING: desktop\dist is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo [OK] desktop\dist is properly ignored
    )
)

if exist "desktop\build\" (
    git check-ignore desktop\build >nul 2>&1
    if errorlevel 1 (
        echo [!] WARNING: desktop\build is NOT in .gitignore!
        set "FOUND_ISSUE=1"
    ) else (
        echo [OK] desktop\build is properly ignored
    )
)

echo.
echo [5/6] Verifying .env.example files exist...
echo.

if exist "backend\.env.example" (
    echo [OK] backend\.env.example exists
) else (
    echo [!] WARNING: backend\.env.example is missing!
    set "FOUND_ISSUE=1"
)

if exist "desktop\.env.example" (
    echo [OK] desktop\.env.example exists
) else (
    echo [!] WARNING: desktop\.env.example is missing!
    set "FOUND_ISSUE=1"
)

echo.
echo [6/6] Checking Git status...
echo.

git status --short | findstr /i "\.env " >nul
if not errorlevel 1 (
    echo [!] CRITICAL: .env files are staged for commit!
    echo     Run: git reset backend\.env desktop\.env
    set "FOUND_ISSUE=1"
) else (
    echo [OK] No .env files staged for commit
)

git status --short | findstr /i "\.db " >nul
if not errorlevel 1 (
    echo [!] CRITICAL: .db files are staged for commit!
    echo     Run: git reset backend\*.db
    set "FOUND_ISSUE=1"
) else (
    echo [OK] No .db files staged for commit
)

echo.
echo ========================================
echo VERIFICATION COMPLETE
echo ========================================
echo.

if "%FOUND_ISSUE%"=="1" (
    echo [!] ISSUES FOUND - DO NOT PUSH YET!
    echo.
    echo Please fix the issues above before pushing to GitHub.
    echo.
    echo Common fixes:
    echo   - Remove .env from staging: git reset backend\.env
    echo   - Add to .gitignore: echo backend/.env ^>^> .gitignore
    echo   - Remove db files: git reset backend\*.db
    echo.
    pause
    exit /b 1
) else (
    echo [OK] ALL CHECKS PASSED!
    echo.
    echo Your repository is ready to push to GitHub.
    echo No sensitive files will be committed.
    echo.
    echo Next steps:
    echo   1. git add .
    echo   2. git commit -m "Initial commit: Production-ready"
    echo   3. git push -u origin main
    echo.
    echo See GITHUB_PUSH_GUIDE.md for detailed instructions.
    echo.
    pause
    exit /b 0
)
