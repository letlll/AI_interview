# 🧪 测试 AI 对话接口

## ⚠️ 当前问题

**错误：** `404 Not Found` - `/api/v1/generate-resume-chat/`

**可能原因：**
1. 后端服务需要重启
2. URL 路由配置有问题
3. 虚拟环境未激活

---

## 🔍 排查步骤

### 1. 检查后端服务是否运行

打开新的终端窗口，运行：

```bash
# Windows PowerShell
cd G:\documents\GitHub\AI_interview\ai_interview_backend

# 激活虚拟环境（如果有）
# .\venv\Scripts\Activate.ps1
# 或
# .\.venv\Scripts\Activate.ps1

# 如果没有虚拟环境，直接运行
python manage.py runserver
```

**预期输出：**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

---

### 2. 测试接口是否存在

在浏览器访问：
```
http://localhost:8000/api/v1/schema/swagger-ui/
```

查找 `generate-resume-chat` 接口是否存在。

---

### 3. 使用 curl 测试

```bash
# 先登录获取 Token
curl -X POST http://localhost:8000/api/v1/auth/login/ ^
  -H "Content-Type: application/json" ^
  -d "{\"username\": \"your_username\", \"password\": \"your_password\"}"

# 复制返回的 access token

# 测试接口
curl -X POST http://localhost:8000/api/v1/generate-resume-chat/ ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -d "{\"user_message\": \"测试\", \"current_resume\": {}, \"chat_history\": [], \"last_edited_field\": null}"
```

---

### 4. 检查 Python 导入

在后端项目根目录运行：

```bash
cd G:\documents\GitHub\AI_interview\ai_interview_backend

# 测试导入
python -c "from interviews.resume_chat_view import GenerateResumeChatView; print('导入成功')"
```

**如果报错：**
```
ModuleNotFoundError: No module named 'rest_framework'
```

说明虚拟环境未激活，需要先激活。

---

## 🛠️ 快速修复方案

### 方案 1：临时测试（不使用新接口）

修改前端代码，暂时使用旧的 `generate-resume` 接口：

```typescript
// src/views/ResumeGeneratorNew.vue
const generateResumeFromChat = async (message, optimizedPrompt) => {
  try {
    // 临时使用旧接口测试
    const response = await generateResumeApi(
      '测试用户',
      '前端工程师',
      '3年',
      message
    );
    
    // 转换为新格式
    return {
      instructions: [
        {
          action: 'replace',
          path: '',
          value: response,
          reason: '使用旧接口生成'
        }
      ],
      message: '简历已生成（使用旧接口）'
    };
  } catch (error) {
    console.error('API 调用失败:', error);
    return {
      instructions: [],
      message: '抱歉，AI 服务暂时不可用'
    };
  }
};
```

---

### 方案 2：检查后端是否正确启动

1. **查看后端控制台**
   - 是否有错误信息？
   - 是否显示 `generate-resume-chat` 路由？

2. **查看后端日志**
   ```bash
   # 在后端目录
   python manage.py show_urls | findstr generate
   ```

3. **手动重启后端**
   - 在后端控制台按 `Ctrl+C`
   - 重新运行 `python manage.py runserver`

---

### 方案 3：验证文件是否正确

检查以下文件是否存在：

```bash
# 检查视图文件
dir G:\documents\GitHub\AI_interview\ai_interview_backend\interviews\resume_chat_view.py

# 检查 ai_services.py 是否有新函数
findstr "generate_resume_chat_response" G:\documents\GitHub\AI_interview\ai_interview_backend\interviews\ai_services.py
```

---

## 🎯 推荐操作步骤

### Step 1: 确认后端运行状态

在后端控制台查看是否有类似输出：
```
[28/Nov/2025 22:XX:XX] "GET /api/v1/auth/profile/ HTTP/1.1" 200 192
```

如果有，说明后端正在运行。

### Step 2: 重启后端服务

1. 在后端控制台按 `Ctrl+C`
2. 等待服务完全停止
3. 重新运行：
   ```bash
   python manage.py runserver
   ```

### Step 3: 查看启动日志

启动时应该看到：
```
System check identified no issues (0 silenced).
November 28, 2025 - 22:XX:XX
Django version X.X.X, using settings 'ai_interview_backend.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

如果看到错误，说明导入有问题。

### Step 4: 测试接口

在浏览器访问：
```
http://localhost:8000/api/v1/generate-resume-chat/
```

**预期结果：**
- 如果返回 `405 Method Not Allowed` - 说明接口存在，但需要 POST 请求 ✅
- 如果返回 `404 Not Found` - 说明接口不存在，需要检查路由 ❌
- 如果返回 `401 Unauthorized` - 说明接口存在，但需要登录 ✅

---

## 📝 调试信息收集

如果问题仍然存在，请提供以下信息：

1. **后端启动日志**（完整的启动输出）
2. **后端控制台错误**（如果有）
3. **前端网络请求详情**（F12 → Network → 点击失败的请求 → Headers）
4. **Python 版本**：`python --version`
5. **Django 版本**：`python -c "import django; print(django.get_version())"`

---

## 🚀 快速测试命令

```bash
# 1. 检查后端是否运行
curl http://localhost:8000/api/v1/auth/login/

# 2. 检查新接口
curl http://localhost:8000/api/v1/generate-resume-chat/

# 3. 查看所有路由
python manage.py show_urls
```

---

## ✅ 成功标志

当接口正常工作时，你应该看到：

**前端控制台：**
```
优化后的 Prompt: ...
Token 估算: XXX
```

**后端控制台：**
```
[28/Nov/2025 22:XX:XX] "POST /api/v1/generate-resume-chat/ HTTP/1.1" 200 XXX
用户 username 发起简历对话: 帮我生成...
```

**浏览器网络面板：**
```
POST /api/v1/generate-resume-chat/
Status: 200 OK
Response: {"instructions": [...], "message": "..."}
```

---

请先尝试**重启后端服务**，然后告诉我结果！🔧
