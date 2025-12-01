@echo off
chcp 65001 >nul
echo ========================================
echo   重新构建并启动后端服务
echo ========================================
echo.

cd /d "%~dp0.."

echo [1/3] 停止后端容器...
docker-compose stop backend
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 停止后端失败
    pause
    exit /b 1
)
echo ✅ 后端已停止
echo.

echo [2/3] 重新构建后端镜像（这可能需要几分钟）...
docker-compose build backend
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

echo [3/3] 启动后端容器...
docker-compose up -d backend
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 启动失败
    pause
    exit /b 1
)
echo ✅ 后端已启动
echo.

echo ========================================
echo   重新构建完成！
echo ========================================
echo.
echo 现在可以查看后端日志：
echo   docker-compose logs -f backend
echo.
echo 或者按任意键退出...
pause >nul
