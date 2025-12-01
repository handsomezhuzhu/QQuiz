@echo off
title PostgreSQL Status Check
color 0B

echo.
echo ========================================
echo   PostgreSQL Database Status Check
echo ========================================
echo.

REM Check PostgreSQL installation
echo [1] Checking PostgreSQL Installation...
if exist "C:\Program Files\PostgreSQL\18" (
    echo OK - PostgreSQL 18 is installed
    echo Location: C:\Program Files\PostgreSQL\18
) else (
    echo ERROR - PostgreSQL 18 not found!
    pause
    exit /b 1
)
echo.

REM Check PostgreSQL service
echo [2] Checking PostgreSQL Service...
sc query postgresql-x64-18 >nul 2>&1
if %errorlevel% equ 0 (
    echo OK - PostgreSQL service exists
    echo.
    echo Service details:
    sc query postgresql-x64-18
    echo.
) else (
    echo WARNING - PostgreSQL service not found!
    echo Trying alternative names...
    sc query | findstr /i "postgres"
)
echo.

REM Check if port 5432 is listening
echo [3] Checking Port 5432...
netstat -ano | findstr ":5432" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo OK - PostgreSQL is listening on port 5432
    netstat -ano | findstr ":5432" | findstr "LISTENING"
) else (
    echo ERROR - Port 5432 is NOT listening!
    echo PostgreSQL service is probably not running.
    echo.
    echo To start the service, you can:
    echo 1. Open Services (services.msc)
    echo 2. Find "postgresql-x64-18" service
    echo 3. Right-click and select "Start"
    echo.
    echo OR run: net start postgresql-x64-18
)
echo.

REM Try to connect to database
echo [4] Testing Database Connection...
set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe" -h localhost -U postgres -c "SELECT version();" postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo OK - Successfully connected to PostgreSQL!
    echo.
    "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe" -h localhost -U postgres -c "SELECT version();" postgres
    echo.

    REM Check if qquiz database exists
    echo [5] Checking QQuiz Database...
    "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe" -h localhost -U postgres -c "\l" postgres | findstr "qquiz_db" >nul
    if %errorlevel% equ 0 (
        echo OK - qquiz_db database exists
    ) else (
        echo INFO - qquiz_db database does not exist yet
        echo This is normal for first-time setup
    )
) else (
    echo ERROR - Cannot connect to PostgreSQL!
    echo.
    echo Possible reasons:
    echo 1. PostgreSQL service is not running
    echo 2. Default password 'postgres' is incorrect
    echo 3. PostgreSQL is not configured to accept local connections
    echo.
    echo Please start the PostgreSQL service first!
)
echo.

echo ========================================
echo   Check Complete
echo ========================================
echo.
pause
