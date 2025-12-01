@echo off
title QQuiz - Start with Docker Database
color 0B

echo.
echo ========================================
echo   QQuiz - Starting with Docker DB
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found!
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    exit /b 1
)
echo OK - Docker installed
echo.

echo [2/4] Starting PostgreSQL in Docker...
docker-compose up -d postgres

if %errorlevel% neq 0 (
    echo ERROR: Failed to start PostgreSQL
    echo Try: docker-compose down
    echo Then run this script again
    pause
    exit /b 1
)

echo OK - PostgreSQL started
echo Waiting for database to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [3/4] Starting Backend...
start "QQuiz Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && echo ======================================== && echo   QQuiz Backend Server && echo ======================================== && echo. && echo API: http://localhost:8000 && echo Docs: http://localhost:8000/docs && echo. && alembic upgrade head && echo. && uvicorn main:app --reload"

echo Waiting for backend to start...
timeout /t 8 /nobreak >nul
echo.

echo [4/4] Starting Frontend...
start "QQuiz Frontend" cmd /k "cd /d %~dp0frontend && echo ======================================== && echo   QQuiz Frontend Server && echo ======================================== && echo. && echo URL: http://localhost:3000 && echo. && npm start"

echo.
echo ========================================
echo   SUCCESS! QQuiz is starting...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Database: Running in Docker
echo.
echo Login:
echo   Username: admin
echo   Password: admin123
echo.
echo ========================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000

echo System running...
echo To stop: Close the backend/frontend windows
echo To stop database: docker-compose down
echo.
pause
