@echo off
chcp 65001 >nul
echo ========================================
echo    启动 Celery Beat (定时任务调度)
echo ========================================
echo.

cd /d G:\documents\GitHub\AI_interview\ai_interview_backend
call conda activate ai_interview

echo 正在启动 Celery Beat...
echo.
echo 按 Ctrl+C 停止 Beat
echo.

celery -A ai_interview_backend beat -l info

pause
