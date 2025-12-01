@echo off
title QQuiz Backend Server
color 0B

echo.
echo ========================================
echo   Starting QQuiz Backend Server
echo ========================================
echo.

cd /d "%~dp0..\backend"

if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing/updating dependencies...
pip install -q -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

echo.
echo Running database migrations...
alembic upgrade head

echo.
echo ========================================
echo   Backend Server Starting...
echo ========================================
echo.
echo API URL:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Health:   http://localhost:8000/health
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
