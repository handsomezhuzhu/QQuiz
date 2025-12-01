@echo off
chcp 65001 >nul
title QQuiz - 快速配置

echo.
echo ==========================================
echo    QQuiz 快速配置
echo ==========================================
echo.

cd /d "%~dp0.."

REM 创建 .env 文件
echo 正在创建配置文件...
echo.

(
echo # QQuiz 配置文件 - 快速启动版
echo.
echo # 数据库配置
echo DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@localhost:5432/qquiz_db
echo.
echo # JWT 密钥（安全随机生成）
echo SECRET_KEY=qquiz-secret-key-for-development-change-in-production-32chars
echo.
echo # AI 配置 - OpenAI
echo AI_PROVIDER=openai
echo OPENAI_API_KEY=sk-your-openai-api-key-here
echo OPENAI_BASE_URL=https://api.openai.com/v1
echo OPENAI_MODEL=gpt-4o-mini
echo.
echo # 系统配置
echo ALLOW_REGISTRATION=true
echo MAX_UPLOAD_SIZE_MB=10
echo MAX_DAILY_UPLOADS=20
echo.
echo # CORS
echo CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
echo.
echo # 上传目录
echo UPLOAD_DIR=./uploads
) > .env

echo ✓ 配置文件已创建
echo.
echo [重要] 请编辑 OPENAI_API_KEY
echo.
echo 按任意键打开配置文件...
pause >nul

notepad .env

echo.
echo 配置完成！现在可以运行 scripts\auto_setup_and_run.bat 启动系统
echo.
pause
