@echo off
chcp 65001 >nul
cd /d "%~dp0"
cd frontend
npm run dev -- --host 0.0.0.0
pause
