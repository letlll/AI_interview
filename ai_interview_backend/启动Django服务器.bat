@echo off
chcp 65001 >nul
echo ========================================
echo    启动 Django 开发服务器
echo ========================================
echo.

cd /d G:\documents\GitHub\AI_interview\ai_interview_backend

REM 设置 Python 完整路径（使用 conda 环境）
set PYTHON_PATH=F:\ProgramData\miniconda3\envs\ai_interview\python.exe

echo 当前 Python 环境:
"%PYTHON_PATH%" --version
echo 路径: %PYTHON_PATH%
echo.

echo 正在启动 Django 服务器...
echo 访问地址: http://localhost:8000
echo 后台管理: http://localhost:8000/admin/
echo API 文档: http://localhost:8000/api/v1/schema/swagger-ui/
echo.
echo 按 Ctrl+C 停止服务器
echo.

"%PYTHON_PATH%" manage.py runserver 0.0.0.0:8000

pause
