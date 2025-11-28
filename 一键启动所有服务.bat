@echo off
chcp 65001 >nul
echo ========================================
echo    AI 面试平台 - 一键启动所有服务
echo ========================================
echo.
echo 正在启动所有服务，请稍候...
echo.

REM 检查 Redis 是否运行
echo [1/5] 检查 Redis 服务...
tasklist /FI "IMAGENAME eq redis-server.exe" 2>NUL | find /I /N "redis-server.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Redis 已运行
) else (
    echo ✗ Redis 未运行，请手动启动 Redis
    echo   启动命令：redis-server
)
echo.

REM 检查 RabbitMQ 是否运行
echo [2/5] 检查 RabbitMQ 服务...
sc query RabbitMQ | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo ✓ RabbitMQ 已运行
) else (
    echo ✗ RabbitMQ 未运行，尝试启动...
    net start RabbitMQ
)
echo.

REM 启动 Django 服务器
echo [3/5] 启动 Django 服务器...
start "Django Server" cmd /k "cd /d G:\documents\GitHub\AI_interview\ai_interview_backend && call conda activate ai_interview && python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak >nul
echo ✓ Django 服务器已启动
echo.

REM 启动 Celery Worker
echo [4/5] 启动 Celery Worker...
start "Celery Worker" cmd /k "cd /d G:\documents\GitHub\AI_interview\ai_interview_backend && call conda activate ai_interview && celery -A ai_interview_backend worker -l info --pool=solo"
timeout /t 2 /nobreak >nul
echo ✓ Celery Worker 已启动
echo.

REM 启动 Celery Beat
echo [5/5] 启动 Celery Beat...
start "Celery Beat" cmd /k "cd /d G:\documents\GitHub\AI_interview\ai_interview_backend && call conda activate ai_interview && celery -A ai_interview_backend beat -l info"
timeout /t 2 /nobreak >nul
echo ✓ Celery Beat 已启动
echo.

REM 启动前端服务器
echo [6/6] 启动前端服务器...
start "Frontend Server" cmd /k "cd /d G:\documents\GitHub\AI_interview\ai-interview-frontend && npm run dev"
echo ✓ 前端服务器已启动
echo.

echo ========================================
echo    所有服务启动完成！
echo ========================================
echo.
echo 访问地址：
echo   前端应用：http://localhost:5173
echo   后台管理：http://localhost:8000/admin/
echo   API 文档：http://localhost:8000/api/v1/schema/swagger-ui/
echo   RabbitMQ：http://localhost:15672 (guest/guest)
echo.
echo 提示：
echo   - 所有服务在独立窗口运行
echo   - 关闭窗口即可停止对应服务
echo   - 首次启动前端可能需要较长时间
echo.

pause
