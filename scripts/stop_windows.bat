@echo off
chcp 65001 >nul
title QQuiz - 停止服务

cd /d "%~dp0.."

echo.
echo ==========================================
echo    停止 QQuiz 服务
echo ==========================================
echo.

docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo [完成] 服务已停止
) else (
    echo.
    echo [错误] 停止服务失败
)

echo.
pause
