@echo off
chcp 65001 >nul
echo ========================================
echo    安装 OCR 相关依赖
echo ========================================
echo.

echo 步骤 1/3: 激活 Anaconda 环境...
call conda activate ai_interview
if errorlevel 1 (
    echo 错误：无法激活 Anaconda 环境
    pause
    exit /b 1
)

echo.
echo 步骤 2/3: 安装 Python 依赖包...
echo 这可能需要几分钟时间，请耐心等待...
echo.

pip install paddlepaddle==3.0.0b2 -i https://mirror.baidu.com/pypi/simple
pip install paddleocr==2.9.1
pip install pdf2image==1.17.0

echo.
echo 步骤 3/3: 下载并安装 Poppler（PDF 转图片工具）
echo.
echo ⚠️  重要提示：
echo    pdf2image 需要 Poppler 工具支持
echo    请按照以下步骤手动安装：
echo.
echo    1. 访问：https://github.com/oschwartz10612/poppler-windows/releases
echo    2. 下载最新版本的 poppler-xx.xx.x.zip
echo    3. 解压到任意目录（例如：C:\Program Files\poppler）
echo    4. 将 poppler 的 bin 目录添加到系统 PATH 环境变量
echo       例如：C:\Program Files\poppler\Library\bin
echo.
echo    或者使用 Chocolatey 安装（如果已安装）：
echo    choco install poppler
echo.

echo ========================================
echo ✓ Python 依赖安装完成！
echo ========================================
echo.
echo 下一步：
echo   1. 安装 Poppler（见上方说明）
echo   2. 重启 Django 服务器
echo   3. 上传扫描版 PDF 测试 OCR 功能
echo.
pause
