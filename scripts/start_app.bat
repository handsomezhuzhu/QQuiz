@echo off
title QQuiz - Starting Application
color 0A

echo.
echo ========================================
echo   QQuiz - Auto Deploy Script
echo ========================================
echo.

cd /d "%~dp0.."

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

echo [1/7] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)
echo OK - Python installed
echo.

echo [2/7] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo OK - Node.js installed
echo.

echo [3/7] Creating MySQL database...
echo.
echo Please enter MySQL root password when prompted
echo (Leave blank if no password set)
echo.

mysql -u root -p -e "DROP DATABASE IF EXISTS qquiz_db; DROP USER IF EXISTS 'qquiz'@'localhost'; CREATE DATABASE qquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'qquiz'@'localhost' IDENTIFIED BY 'qquiz_password'; GRANT ALL PRIVILEGES ON qquiz_db.* TO 'qquiz'@'localhost'; FLUSH PRIVILEGES;" 2>nul

echo Database setup complete
echo.

echo [4/7] Installing backend dependencies...
cd backend

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo Backend dependencies installed
echo.

echo [5/7] Running database migrations...
alembic upgrade head 2>nul

cd ..
echo.

echo [6/7] Installing frontend dependencies...
cd frontend

if not exist "node_modules" (
    call npm config set registry https://registry.npmmirror.com
    call npm install --silent
)

cd ..
echo.

echo [7/7] Starting services...
echo.

start "QQuiz Backend" cmd /k "cd /d %~dp0..\backend && call venv\Scripts\activate.bat && echo Backend API: http://localhost:8000 && echo API Docs: http://localhost:8000/docs && echo. && uvicorn main:app --reload"

timeout /t 5 /nobreak >nul

start "QQuiz Frontend" cmd /k "cd /d %~dp0..\frontend && echo Frontend: http://localhost:3000 && echo. && npm start"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   SUCCESS! QQuiz is starting...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Default login:
echo   Username: admin
echo   Password: admin123
echo.
echo ========================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000

echo System is running...
echo Close backend and frontend windows to stop
echo.
pause
