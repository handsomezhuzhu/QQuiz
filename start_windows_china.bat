@echo off
chcp 65001 >nul
title QQuiz - 启动服务 (国内优化版)

echo.
echo ==========================================
echo    QQuiz - 智能刷题与题库管理平台
echo    (国内网络优化版)
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

echo [1/5] 检查 Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker Desktop 未运行！
    echo.
    echo 请先启动 Docker Desktop，然后按任意键继续...
    pause >nul

    REM 再次检查
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo [错误] Docker Desktop 启动失败！
        pause
        exit /b 1
    )
)
echo [完成] Docker Desktop 运行正常
echo.

echo [2/5] 检查镜像加速器配置...
docker info | findstr "Registry Mirrors" >nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到镜像加速器配置
    echo.
    echo 强烈建议配置镜像加速器以提高下载速度！
    echo.
    choice /C YN /M "是否现在配置镜像加速器"
    if %errorlevel% equ 1 (
        echo.
        echo 请按照提示配置 Docker Desktop 镜像加速器...
        call setup_docker_mirror.bat
        echo.
        echo 配置完成后，请重新运行此脚本
        pause
        exit /b 0
    )
) else (
    echo [完成] 已配置镜像加速器
)
echo.

echo [3/5] 停止旧容器...
docker-compose down >nul 2>&1
echo [完成]
echo.

echo [4/5] 启动服务（首次启动需要几分钟）...
echo.
echo [提示] 如果下载镜像失败，请：
echo   1. 配置镜像加速器（运行 setup_docker_mirror.bat）
echo   2. 或使用备用启动方式（见下方提示）
echo.

docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务启动失败！
    echo.
    echo 可能的原因：
    echo 1. 网络问题 - 无法下载 Docker 镜像
    echo 2. 端口被占用 - 3000/8000/5432 端口已被使用
    echo 3. 配置错误 - 检查 .env 文件
    echo.
    echo 解决方案：
    echo 1. 配置镜像加速器: 运行 setup_docker_mirror.bat
    echo 2. 查看详细错误: docker-compose logs
    echo 3. 阅读文档: DOCKER_MIRROR_SETUP.md
    echo.
    pause
    exit /b 1
)
echo [完成] 服务启动成功
echo.

echo [5/5] 等待服务就绪...
timeout /t 8 /nobreak >nul
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
echo 镜像加速: 已配置国内镜像源
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
