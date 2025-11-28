@echo off
chcp 65001 >nul
echo ========================================
echo    启动 Redis 服务器
echo ========================================
echo.

echo 正在启动 Redis...
echo 默认端口：6379
echo.
echo 按 Ctrl+C 停止 Redis
echo.

redis-server

pause
