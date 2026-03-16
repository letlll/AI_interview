@echo off
chcp 65001 >nul
echo ========================================
echo    AI 简历生成器 - 前端测试脚本
echo ========================================
echo.

echo [1/4] 检查前端服务状态...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 前端服务未运行！
    echo.
    echo 请先启动前端服务：
    echo   cd ai-interview-frontend
    echo   npm run dev
    echo.
    pause
    exit /b 1
) else (
    echo ✅ 前端服务正在运行
)
echo.

echo [2/4] 打开浏览器访问简历生成页面...
start http://localhost:5173/dashboard/generate-resume
timeout /t 2 >nul
echo ✅ 已打开浏览器
echo.

echo [3/4] 测试步骤：
echo.
echo   1️⃣  在输入框输入：帮我生成一份前端工程师的简历
echo   2️⃣  点击发送或按 Enter
echo   3️⃣  查看 AI 回复和右侧简历预览
echo   4️⃣  打开浏览器控制台（F12）查看日志
echo.

echo [4/4] 预期结果：
echo.
echo   ✅ AI 回复：我已经为你生成了一份前端工程师的简历框架...
echo   ✅ 右侧显示：姓名、电话、邮箱、技能、工作经历等
echo   ✅ 控制台日志：
echo      - 收到更新指令: [...]
echo      - 当前简历数据: {...}
echo      - 应用指令后的数据: {...}
echo      - 最终简历数据: {...}
echo.

echo ========================================
echo    如果右侧预览区是空白的
echo ========================================
echo.
echo 请检查控制台日志：
echo   1. 是否有 "收到更新指令" 日志？
echo   2. "应用指令后的数据" 是否为空？
echo   3. "最终简历数据" 是否有内容？
echo.
echo 常见问题：
echo   - 如果没有日志 → AI 响应有问题
echo   - 如果数据为空 → applyInstructions 函数有问题
echo   - 如果有数据但不显示 → 组件渲染有问题
echo.

echo ========================================
echo    快速调试命令
echo ========================================
echo.
echo 在浏览器控制台运行：
echo.
echo   // 查看当前简历数据
echo   console.log(window.__VUE_DEVTOOLS_GLOBAL_HOOK__)
echo.
echo   // 或直接在 Vue DevTools 中查看
echo   // Components → ResumeGeneratorNew → resumeData
echo.

pause
