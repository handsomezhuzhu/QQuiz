@echo off
title QQuiz - System Status Check

cd /d "%~dp0.."

echo.
echo ========================================
echo   QQuiz System Status Check
echo ========================================
echo.

echo [1] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
) else (
    echo OK
)
echo.

echo [2] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
) else (
    echo OK
)
echo.

echo [3] Checking PostgreSQL...
psql --version
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL command not found in PATH
) else (
    echo OK
)
echo.

echo [4] Checking if backend is running...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Backend is NOT running on port 8000
    echo.
    echo Backend must be started first!
    echo Run the backend window manually:
    echo   cd backend
    echo   venv\Scripts\activate.bat
    echo   uvicorn main:app --reload
) else (
    echo OK - Backend is running
)
echo.

echo [5] Checking if frontend is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Frontend is NOT running on port 3000
) else (
    echo OK - Frontend is running
)
echo.

echo [6] Checking ports...
echo Checking port 8000 (Backend):
netstat -ano | findstr :8000
echo.
echo Checking port 3000 (Frontend):
netstat -ano | findstr :3000
echo.

echo [7] Checking .env configuration...
if exist ".env" (
    echo OK - .env file exists
    findstr /C:"OPENAI_API_KEY=sk-" .env >nul
    if %errorlevel% neq 0 (
        echo WARNING: OPENAI_API_KEY may not be configured properly
    ) else (
        echo OK - API Key appears to be configured
    )
) else (
    echo ERROR: .env file not found!
)
echo.

echo ========================================
echo   Diagnosis Complete
echo ========================================
echo.
pause
