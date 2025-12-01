@echo off
chcp 65001 >nul
title QQuiz - 推送到 GitHub

echo.
echo ==========================================
echo    推送 QQuiz 到 GitHub
echo ==========================================
echo.

cd /d "%~dp0.."

REM 检查是否有远程仓库
git remote -v | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo [提示] 首次推送，正在配置远程仓库...
    git remote add origin https://github.com/handsomezhuzhu/QQuiz.git
    echo [完成] 远程仓库已配置
    echo.
)

echo [1/4] 检查更改...
git status

echo.
echo [2/4] 添加所有更改...
git add .

echo.
set /p commit_msg="请输入提交信息 (或直接回车使用默认): "

if "%commit_msg%"=="" (
    set commit_msg=Update: minor changes
)

echo.
echo [3/4] 提交更改...
git commit -m "%commit_msg%"

if %errorlevel% neq 0 (
    echo [提示] 没有需要提交的更改
)

echo.
echo [4/4] 推送到 GitHub...
echo.
echo [重要] 如果是首次推送，需要输入 GitHub 认证：
echo   Username: handsomezhuzhu
echo   Password: 使用 Personal Access Token (不是密码!)
echo.
echo 如何获取 Token: 参考 docs/GITHUB_PUSH_GUIDE.md
echo.
pause

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo    ✅ 推送成功！
    echo ==========================================
    echo.
    echo 访问仓库: https://github.com/handsomezhuzhu/QQuiz
    echo.
) else (
    echo.
    echo ==========================================
    echo    ❌ 推送失败！
    echo ==========================================
    echo.
    echo 可能的原因：
    echo 1. 未配置 GitHub 认证
    echo 2. Token 过期或无效
    echo 3. 网络连接问题
    echo.
    echo 解决方案：
    echo 1. 阅读 docs/GITHUB_PUSH_GUIDE.md 配置认证
    echo 2. 确认 Personal Access Token 有效
    echo 3. 检查网络连接
    echo.
)

pause
