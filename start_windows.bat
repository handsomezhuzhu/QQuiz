@echo off
chcp 65001 >nul
title QQuiz - 启动服务

echo.
echo ==========================================
echo    QQuiz - 智能刷题与题库管理平台
echo ==========================================
echo.

REM 检查是否在项目目录
if not exist "docker-compose.yml" (
    echo [错误] 请在项目根目录运行此脚本！
    pause
    exit /b 1
)

REM 检查 .env 文件
if not exist ".env" (
    echo [警告] .env 文件不存在，正在从模板创建...
    copy .env.example .env >nul
    echo [完成] 已创建 .env 文件，请编辑后重新运行此脚本
    notepad .env
    pause
    exit /b 1
)

echo [1/4] 检查 Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] Docker Desktop 未运行，正在启动...
    echo.
    echo 请手动启动 Docker Desktop，然后按任意键继续...
    pause >nul

    REM 再次检查
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo [错误] Docker Desktop 启动失败！
        echo 请确保已安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
    )
)
echo [完成] Docker Desktop 运行正常
echo.

echo [2/4] 停止旧容器...
docker-compose down >nul 2>&1
echo [完成] 旧容器已停止
echo.

echo [3/4] 启动服务（首次启动需要几分钟下载镜像）...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [错误] 服务启动失败！
    echo 请查看错误信息或运行: docker-compose logs
    pause
    exit /b 1
)
echo [完成] 服务启动成功
echo.

echo [4/4] 等待服务就绪...
timeout /t 5 /nobreak >nul
echo.

echo ==========================================
echo    服务已启动！
echo ==========================================
echo.
echo 前端地址: http://localhost:3000
echo 后端地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 默认账户:
echo   用户名: admin
echo   密码: admin123
echo.
echo ==========================================
echo.

REM 询问是否打开浏览器
choice /C YN /M "是否打开浏览器"
if %errorlevel% equ 1 (
    start http://localhost:3000
)

echo.
echo 按任意键查看日志（Ctrl+C 退出日志查看）...
pause >nul
docker-compose logs -f
