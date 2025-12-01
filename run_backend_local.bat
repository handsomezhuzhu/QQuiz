@echo off
chcp 65001 >nul
title QQuiz Backend - 本地运行

echo.
echo ==========================================
echo    QQuiz Backend - 本地启动
echo ==========================================
echo.

cd /d "%~dp0backend"

REM 检查虚拟环境是否存在
if not exist "venv\Scripts\activate.bat" (
    echo [1/5] 创建虚拟环境...
    python -m venv venv
    echo [完成]
    echo.
) else (
    echo [1/5] 虚拟环境已存在
    echo.
)

echo [2/5] 激活虚拟环境...
call venv\Scripts\activate.bat
echo [完成]
echo.

echo [3/5] 安装依赖...
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [完成]
echo.

echo [4/5] 运行数据库迁移...
alembic upgrade head
if %errorlevel% neq 0 (
    echo [警告] 数据库迁移失败，请检查 PostgreSQL 是否运行
    echo.
)
echo.

echo [5/5] 启动后端服务...
echo.
echo ==========================================
echo    后端服务启动中...
echo ==========================================
echo.
echo API 地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo ==========================================
echo.

uvicorn main:app --reload
