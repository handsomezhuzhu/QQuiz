@echo off
title QQuiz - Restart Backend
color 0B

cd /d "%~dp0.."

echo.
echo ========================================
echo   Restarting Backend Container
echo ========================================
echo.

echo Restarting backend...
docker-compose restart backend

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Backend Restarted!
echo ========================================
echo.
echo Backend URL: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo View logs: scripts\view_backend_logs.bat
echo.

pause
