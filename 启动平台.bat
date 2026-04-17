@echo off
chcp 65001 >nul
setlocal

if /i "%~1"=="--hidden" (
    shift
    goto run_hidden
)

cd /d "%~dp0" || (
    echo Failed to enter the project directory.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found in PATH.
    echo Please install Node.js and try again.
    pause
    exit /b 1
)

node ".\scripts\start-platform.js" %*
set "exitCode=%errorlevel%"

if not "%exitCode%"=="0" (
    echo.
    echo Platform startup failed. Check the messages above.
    pause
)

exit /b %exitCode%

:run_hidden
wscript.exe "%~dp0start-platform-hidden.vbs" %*
exit /b %errorlevel%
