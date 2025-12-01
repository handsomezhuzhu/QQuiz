@echo off
title Start PostgreSQL Service
color 0B

echo.
echo ========================================
echo   Starting PostgreSQL Service
echo ========================================
echo.

echo Attempting to start PostgreSQL service...
echo.

net start postgresql-x64-18

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS!
    echo ========================================
    echo.
    echo PostgreSQL service is now running
    echo Port: 5432
    echo.
    echo You can now run: scripts\fix_and_start.bat
    echo.
) else (
    echo.
    echo ========================================
    echo   Failed to start service
    echo ========================================
    echo.
    echo Please try starting manually:
    echo 1. Press Win+R
    echo 2. Type: services.msc
    echo 3. Find "postgresql-x64-18"
    echo 4. Right-click and select "Start"
    echo.
    echo OR run this script as Administrator:
    echo Right-click this bat file and select "Run as administrator"
    echo.
)

pause
