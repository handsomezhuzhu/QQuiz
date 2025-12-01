@echo off
chcp 65001 >nul
title QQuiz - 配置 Docker 镜像加速器

echo.
echo ==========================================
echo    配置 Docker 镜像加速器
echo ==========================================
echo.

echo [提示] 此脚本将帮助您配置 Docker Desktop 使用国内镜像源
echo.
echo 请按照以下步骤操作：
echo.
echo 1. 打开 Docker Desktop
echo 2. 点击右上角的齿轮图标 ⚙️ (设置)
echo 3. 选择左侧菜单的 "Docker Engine"
echo 4. 在 JSON 配置中找到或添加 "registry-mirrors" 部分
echo.
echo 将以下内容复制到配置中：
echo.
echo ==========================================
echo.
echo   "registry-mirrors": [
echo     "https://docker.mirrors.ustc.edu.cn",
echo     "https://hub-mirror.c.163.com",
echo     "https://mirror.baidubce.com"
echo   ]
echo.
echo ==========================================
echo.
echo 完整配置示例：
echo.
echo {
echo   "builder": {
echo     "gc": {
echo       "defaultKeepStorage": "20GB",
echo       "enabled": true
echo     }
echo   },
echo   "experimental": false,
echo   "registry-mirrors": [
echo     "https://docker.mirrors.ustc.edu.cn",
echo     "https://hub-mirror.c.163.com",
echo     "https://mirror.baidubce.com"
echo   ]
echo }
echo.
echo ==========================================
echo.
echo 5. 点击 "Apply & Restart" 应用并重启 Docker
echo 6. 等待 Docker Desktop 重启完成
echo 7. 重新运行 start_windows.bat
echo.

pause
