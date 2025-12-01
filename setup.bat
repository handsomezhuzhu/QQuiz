@echo off
cd /d "%~dp0"

echo Creating .env configuration file...
echo.

(
echo DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@localhost:5432/qquiz_db
echo SECRET_KEY=qquiz-secret-key-for-development-change-in-production-32chars
echo AI_PROVIDER=openai
echo OPENAI_API_KEY=sk-your-openai-api-key-here
echo OPENAI_BASE_URL=https://api.openai.com/v1
echo OPENAI_MODEL=gpt-4o-mini
echo ALLOW_REGISTRATION=true
echo MAX_UPLOAD_SIZE_MB=10
echo MAX_DAILY_UPLOADS=20
echo CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
echo UPLOAD_DIR=./uploads
) > .env

echo Done! .env file created.
echo.
echo IMPORTANT: Please edit OPENAI_API_KEY in .env file
echo.
echo Opening .env file now...
timeout /t 2 /nobreak >nul

notepad .env

echo.
echo Configuration complete!
echo Now you can run: start_app.bat
echo.
pause
