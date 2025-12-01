@echo off
REM 激活虚拟环境的批处理脚本
cd /d "%~dp0..\backend"
call venv\Scripts\activate.bat
cmd /k
