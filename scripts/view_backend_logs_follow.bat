@echo off
chcp 65001 >nul
echo ========================================
echo   实时查看后端日志
echo ========================================
echo.
echo 按 Ctrl+C 可以停止查看日志
echo.

cd /d "%~dp0.."

docker-compose logs -f backend
