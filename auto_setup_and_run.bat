@echo off
chcp 65001 >nul
title QQuiz - 全自动部署

color 0A
echo.
echo ██████╗  ██████╗ ██╗   ██╗██╗███████╗
echo ██╔═══██╗██╔═══██╗██║   ██║██║╚══███╔╝
echo ██║   ██║██║   ██║██║   ██║██║  ███╔╝
echo ██║▄▄ ██║██║▄▄ ██║██║   ██║██║ ███╔╝
echo ╚██████╔╝╚██████╔╝╚██████╔╝██║███████╗
echo  ╚══▀▀═╝  ╚══▀▀═╝  ╚═════╝ ╚═╝╚══════╝
echo.
echo ==========================================
echo    智能刷题与题库管理平台
echo    全自动部署脚本
echo ==========================================
echo.

cd /d "%~dp0"

REM ============================================
REM 步骤 1: 检查环境
REM ============================================
echo [1/8] 检查运行环境...
echo.

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python！
    echo 请先安装 Python 3.11+: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo   ✓ Python 已安装

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)
echo   ✓ Node.js 已安装

REM 检查 PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 PostgreSQL 命令行工具
    echo   可能已安装但未加入 PATH，继续尝试...
)
echo   ✓ 环境检查完成
echo.

REM ============================================
REM 步骤 2: 配置环境变量
REM ============================================
echo [2/8] 配置环境变量...
echo.

if not exist ".env" (
    copy .env.example .env >nul
    echo   ✓ 已创建 .env 文件
    echo.
    echo [重要] 请编辑 .env 文件，配置以下项：
    echo   1. SECRET_KEY - JWT密钥（至少32字符）
    echo   2. OPENAI_API_KEY - OpenAI API密钥
    echo.
    echo 按任意键打开 .env 文件编辑...
    pause >nul
    notepad .env
    echo.
    echo 编辑完成后，按任意键继续...
    pause >nul
) else (
    echo   ✓ .env 文件已存在
)
echo.

REM ============================================
REM 步骤 3: 创建数据库
REM ============================================
echo [3/8] 配置数据库...
echo.

echo 请输入 PostgreSQL 信息（或直接回车使用默认值）：
echo.
set /p PGHOST="数据库主机 [默认: localhost]: "
if "%PGHOST%"=="" set PGHOST=localhost

set /p PGPORT="数据库端口 [默认: 5432]: "
if "%PGPORT%"=="" set PGPORT=5432

set /p PGUSER="管理员用户名 [默认: postgres]: "
if "%PGUSER%"=="" set PGUSER=postgres

echo.
echo 正在创建数据库和用户...
echo.

REM 创建数据库脚本
echo DROP DATABASE IF EXISTS qquiz_db; > temp_create_db.sql
echo DROP USER IF EXISTS qquiz; >> temp_create_db.sql
echo CREATE USER qquiz WITH PASSWORD 'qquiz_password'; >> temp_create_db.sql
echo CREATE DATABASE qquiz_db OWNER qquiz; >> temp_create_db.sql
echo GRANT ALL PRIVILEGES ON DATABASE qquiz_db TO qquiz; >> temp_create_db.sql

REM 执行 SQL
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -f temp_create_db.sql 2>nul
if %errorlevel% equ 0 (
    echo   ✓ 数据库创建成功
    del temp_create_db.sql
) else (
    echo   ! 数据库创建可能失败，继续尝试...
    del temp_create_db.sql
)
echo.

REM 更新 .env 中的数据库连接
powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@%PGHOST%:%PGPORT%/qquiz_db' | Set-Content .env"
echo   ✓ 已更新数据库连接配置
echo.

REM ============================================
REM 步骤 4: 安装后端依赖
REM ============================================
echo [4/8] 安装后端依赖...
echo.

cd backend

if not exist "venv" (
    echo   创建虚拟环境...
    python -m venv venv
)

echo   激活虚拟环境并安装依赖...
call venv\Scripts\activate.bat && pip install -q -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

if %errorlevel% equ 0 (
    echo   ✓ 后端依赖安装成功
) else (
    echo   ! 部分依赖可能安装失败，继续尝试...
)
echo.

REM ============================================
REM 步骤 5: 初始化数据库
REM ============================================
echo [5/8] 初始化数据库表...
echo.

call venv\Scripts\activate.bat && alembic upgrade head 2>nul
if %errorlevel% equ 0 (
    echo   ✓ 数据库表创建成功
) else (
    echo   ! 数据库迁移失败，将在启动时自动创建
)
echo.

cd ..

REM ============================================
REM 步骤 6: 安装前端依赖
REM ============================================
echo [6/8] 安装前端依赖...
echo.

cd frontend

if not exist "node_modules" (
    echo   使用淘宝镜像加速...
    call npm config set registry https://registry.npmmirror.com
    echo   安装依赖（需要几分钟）...
    call npm install --silent

    if %errorlevel% equ 0 (
        echo   ✓ 前端依赖安装成功
    ) else (
        echo   ! 前端依赖安装失败
        cd ..
        pause
        exit /b 1
    )
) else (
    echo   ✓ 前端依赖已安装
)
echo.

cd ..

REM ============================================
REM 步骤 7: 启动后端服务
REM ============================================
echo [7/8] 启动后端服务...
echo.

start "QQuiz Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && echo ======================================== && echo    QQuiz 后端服务 && echo ======================================== && echo. && echo API 地址: http://localhost:8000 && echo API 文档: http://localhost:8000/docs && echo. && echo 按 Ctrl+C 停止服务 && echo. && uvicorn main:app --reload"

echo   ✓ 后端服务已在新窗口中启动
echo   等待服务启动...
timeout /t 8 /nobreak >nul
echo.

REM ============================================
REM 步骤 8: 启动前端服务
REM ============================================
echo [8/8] 启动前端服务...
echo.

start "QQuiz Frontend" cmd /k "cd /d %~dp0frontend && echo ======================================== && echo    QQuiz 前端服务 && echo ======================================== && echo. && echo 前端地址: http://localhost:3000 && echo. && echo 按 Ctrl+C 停止服务 && echo. && npm start"

echo   ✓ 前端服务已在新窗口中启动
echo   等待服务启动...
timeout /t 5 /nobreak >nul
echo.

REM ============================================
REM 完成
REM ============================================
color 0B
echo.
echo ==========================================
echo    🎉 部署完成！
echo ==========================================
echo.
echo 服务地址：
echo   前端: http://localhost:3000
echo   后端: http://localhost:8000
echo   文档: http://localhost:8000/docs
echo.
echo 默认账户：
echo   用户名: admin
echo   密码: admin123
echo.
echo ⚠️  首次登录后请立即修改密码！
echo.
echo 测试数据：
echo   test_data/sample_questions.txt
echo.
echo ==========================================
echo.

REM 询问是否打开浏览器
choice /C YN /M "是否打开浏览器访问系统"
if %errorlevel% equ 1 (
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
)

echo.
echo 系统正在运行中...
echo 关闭此窗口不会停止服务
echo 要停止服务，请关闭后端和前端窗口
echo.
pause
