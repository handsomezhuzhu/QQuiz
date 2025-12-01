@echo off
title QQuiz - Backend Logs
color 0B

cd /d "%~dp0.."

echo.
echo ========================================
echo   QQuiz Backend Logs (Real-time)
echo ========================================
echo.
echo Press Ctrl+C to stop viewing logs
echo.

docker-compose logs -f --tail=50 backend
