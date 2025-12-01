@echo off
title QQuiz Frontend Server
color 0B

echo.
echo ========================================
echo   Starting QQuiz Frontend Server
echo ========================================
echo.

cd /d "%~dp0..\frontend"

if not exist "node_modules" (
    echo Installing dependencies (first time only)...
    call npm config set registry https://registry.npmmirror.com
    call npm install
)

echo.
echo ========================================
echo   Frontend Server Starting...
echo ========================================
echo.
echo Frontend URL: http://localhost:3000
echo.
echo Make sure backend is running on port 8000!
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

npm start

pause
