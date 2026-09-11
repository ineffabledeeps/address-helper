@echo off
REM Address Helper Extension Auto-Update Script
REM This script pulls the latest code from GitHub using gh CLI and notifies you to reload the extension

echo.
echo ========================================
echo  Address Helper - Auto Update
echo ========================================
echo.

REM Get current directory
cd /d "%~dp0"

REM Check if gh (GitHub CLI) is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: GitHub CLI (gh) is not installed
    echo.
    echo Attempting to install GitHub CLI...
    echo.
    
    REM Try using winget
    winget --version >nul 2>&1
    if not errorlevel 1 (
        echo Installing GitHub CLI using winget...
        winget install --id GitHub.cli -e --accept-source-agreements
    ) else (
        echo Please install GitHub CLI from: https://cli.github.com/
        pause
        exit /b 1
    )
    
    echo.
    echo Verifying GitHub CLI installation...
    gh --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ERROR: GitHub CLI installation failed
        echo Please install it manually from https://cli.github.com/
        pause
        exit /b 1
    )
    
    echo GitHub CLI installed successfully!
    echo.
)

REM Check if we're in a git repository
if not exist ".git" (
    echo ERROR: This folder is not a Git repository
    pause
    exit /b 1
)

echo Pulling latest updates from GitHub...
echo.

REM Pull latest code using git (with gh authentication)
git pull

if errorlevel 1 (
    echo.
    echo ERROR: Failed to pull updates
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Update Complete!
echo ========================================
echo.

REM Show repository info
for /f "tokens=*" %%i in ('gh repo view --json nameWithOwner --jq .nameWithOwner 2^>nul') do set REPO_INFO=%%i
if defined REPO_INFO (
    echo Repository: %REPO_INFO%
    echo.
)

echo Next steps:
echo 1. Press any key to open chrome://extensions in your browser
echo 2. Find "Address Helper"
echo 3. Click the Reload button (circular arrow icon)
echo.
pause

REM Open chrome://extensions in default browser
start chrome://extensions/

exit /b 0
