@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"
node "%~dp0scripts\start-platform.js" %*
set "exitCode=%errorlevel%"

if not "%exitCode%"=="0" (
    echo.
    echo Platform startup failed. Check the messages above.
    pause
)

exit /b %exitCode%
