@echo off
title QQuiz - Fix and Start
color 0E

echo.
echo ========================================
echo   QQuiz - Automatic Fix and Start
echo ========================================
echo.

cd /d "%~dp0"

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env >nul
    echo.
    echo IMPORTANT: Edit .env and set your OPENAI_API_KEY
    echo Opening .env file...
    timeout /t 2 /nobreak >nul
    notepad .env
    echo.
    echo Save and close .env, then press any key to continue...
    pause >nul
)

echo.
echo Choose database option:
echo.
echo [1] Use Docker (Recommended - Easy)
echo [2] Use Local PostgreSQL (Advanced)
echo.
choice /C 12 /M "Select option"

if %errorlevel% equ 1 (
    echo.
    echo Using Docker PostgreSQL...
    echo.

    REM Check Docker
    docker --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Docker not found!
        echo.
        echo Please install Docker Desktop:
        echo https://www.docker.com/products/docker-desktop/
        echo.
        echo After installing Docker, run this script again.
        pause
        exit /b 1
    )

    echo Starting PostgreSQL in Docker...
    docker-compose up -d postgres

    if %errorlevel% neq 0 (
        echo.
        echo Docker failed to start. Trying to fix...
        docker-compose down
        docker-compose up -d postgres
    )

    echo Waiting for database...
    timeout /t 8 /nobreak >nul

) else (
    echo.
    echo Using Local PostgreSQL...
    echo.
    echo Make sure PostgreSQL is running on port 5432
    echo.
    echo If you see connection errors, you need to:
    echo 1. Start PostgreSQL service
    echo 2. Or install PostgreSQL from https://www.postgresql.org/download/
    echo 3. Or choose option 1 to use Docker instead
    echo.
    pause
)

echo.
echo ========================================
echo   Starting Backend...
echo ========================================
echo.

cd backend

if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Installing dependencies...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo.
echo Running database migrations...
alembic upgrade head

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Database migration failed
    echo The app will try to create tables automatically
    echo.
)

cd ..

echo.
echo Starting services...
echo.

start "QQuiz Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && echo Backend: http://localhost:8000 && echo Docs: http://localhost:8000/docs && echo. && uvicorn main:app --reload"

timeout /t 8 /nobreak >nul

start "QQuiz Frontend" cmd /k "cd /d %~dp0frontend && echo Frontend: http://localhost:3000 && echo. && npm start"

echo.
echo ========================================
echo   SUCCESS! QQuiz is starting...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo Login: admin / admin123
echo.
echo ========================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo System is running...
echo Close backend/frontend windows to stop
echo.
pause
