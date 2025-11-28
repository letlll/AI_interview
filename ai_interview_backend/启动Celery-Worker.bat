@echo off
chcp 65001 >nul
echo ========================================
echo    启动 Celery Worker (异步任务处理)
echo ========================================
echo.

cd /d G:\documents\GitHub\AI_interview\ai_interview_backend
call conda activate ai_interview

echo 正在启动 Celery Worker...
echo 注意：Windows 需要使用 --pool=solo 参数
echo.
echo 按 Ctrl+C 停止 Worker
echo.

celery -A ai_interview_backend worker -l info --pool=solo

pause
