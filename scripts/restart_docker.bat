@echo off
title QQuiz - Restart Docker Services
color 0B

cd /d "%~dp0.."

echo.
echo ========================================
echo   Restarting QQuiz Docker Services
echo ========================================
echo.

echo [1/4] Stopping existing containers...
docker-compose down
echo OK
echo.

echo [2/4] Rebuilding backend image...
docker-compose build backend --no-cache
echo OK
echo.

echo [3/4] Starting all services...
docker-compose up -d
echo OK
echo.

echo [4/4] Waiting for services to be ready...
timeout /t 15 /nobreak >nul
echo.

echo ========================================
echo   Services Restarted!
echo ========================================
echo.
echo Checking service status...
docker-compose ps
echo.

echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Database: MySQL on port 3306
echo.
echo Login: admin / admin123
echo.

pause
