@echo off
REM Address Helper Extension Auto-Update Script
REM This script pulls the latest code from GitHub and notifies you to reload the extension

echo.
echo ========================================
echo  Address Helper - Auto Update
echo ========================================
echo.

REM Get current directory
cd /d "%~dp0"

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Git is not installed
    echo.
    echo Attempting to install Git...
    echo.
    
    REM Try using winget first
    winget --version >nul 2>&1
    if errorlevel 1 (
        echo Installing Git using winget...
        winget install --id Git.Git -e --accept-source-agreements
    ) else (
        REM Fallback: Try chocolatey
        choco --version >nul 2>&1
        if errorlevel 1 (
            echo Installing Git using chocolatey...
            choco install git -y
        ) else (
            REM Last resort: Download and install from official source
            echo Downloading Git installer from https://git-scm.com/
            powershell -Command "(New-Object System.Net.ServicePointManager).SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; (New-Object System.Net.WebClient).DownloadFile('https://github.com/git-for-windows/git/releases/download/v2.45.0.windows.1/Git-2.45.0-64-bit.exe', '%temp%\GitInstaller.exe')"
            
            if exist "%temp%\GitInstaller.exe" (
                echo Running Git installer...
                "%temp%\GitInstaller.exe" /VERYSILENT /NORESTART
                timeout /t 5 /nobreak
                del "%temp%\GitInstaller.exe"
            ) else (
                echo.
                echo ERROR: Could not download Git installer
                echo Please install Git manually from https://git-scm.com/download/win
                pause
                exit /b 1
            )
        )
    )
    
    echo.
    echo Verifying Git installation...
    git --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ERROR: Git installation failed
        echo Please install Git manually from https://git-scm.com/download/win
        pause
        exit /b 1
    )
    
    echo Git installed successfully!
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

REM Pull latest code
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
echo Next steps:
echo 1. Press any key to open chrome://extensions in your browser
echo 2. Find "Address Helper"
echo 3. Click the Reload button (circular arrow icon)
echo.
pause

REM Open chrome://extensions in default browser
start chrome://extensions/

exit /b 0
