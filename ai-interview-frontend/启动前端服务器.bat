@echo off
chcp 65001 >nul
echo ========================================
echo    启动前端开发服务器
echo ========================================
echo.

cd /d G:\documents\GitHub\AI_interview\ai-interview-frontend

echo 正在启动前端服务器...
echo 访问地址：http://localhost:5173
echo.
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause
