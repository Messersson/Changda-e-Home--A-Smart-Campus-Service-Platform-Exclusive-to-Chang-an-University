@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo 长安大学校园服务平台 - 一键启动
echo ========================================
echo.

if not exist "backend\package.json" (
    echo [错误] 未找到 backend\package.json
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [错误] 未找到 frontend\package.json
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装并配置环境变量。
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 npm，请检查 Node.js 安装是否完整。
    pause
    exit /b 1
)

echo [1/2] 正在启动平台（后端 + 前端）...
node "%~dp0start-all.js"

echo.
echo [2/2] 启动命令已发送，后端与前端将并行启动。
echo.
echo 默认访问地址：
echo - 用户端：http://localhost:5173
echo - 管理端：http://localhost:5173/admin
echo.
echo 说明：
echo - 如果 5173 端口被占用，Vite 会自动切换到 5174、5175 等端口。
echo - 请以后端和前端新打开的终端窗口输出为准。
echo - 关闭对应终端窗口即可停止服务。
echo.
pause
