@echo off
chcp 65001 >nul
title QQuiz - 查看日志

echo.
echo ==========================================
echo    QQuiz 服务日志
echo ==========================================
echo.
echo 按 Ctrl+C 退出日志查看
echo.

docker-compose logs -f
