@echo off
chcp 65001 >nul
title QQuiz Frontend - 本地运行

echo.
echo ==========================================
echo    QQuiz Frontend - 本地启动
echo ==========================================
echo.

cd /d "%~dp0..\frontend"

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/2] 安装前端依赖（首次运行需要几分钟）...
    echo.
    echo [提示] 使用淘宝镜像加速下载...
    call npm config set registry https://registry.npmmirror.com
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [完成]
    echo.
) else (
    echo [1/2] 依赖已安装
    echo.
)

echo [2/2] 启动前端服务...
echo.
echo ==========================================
echo    前端服务启动中...
echo ==========================================
echo.
echo 前端地址: http://localhost:3000
echo.
echo 按 Ctrl+C 停止服务
echo ==========================================
echo.

call npm start
