# 🚀 后端 AI 对话式简历生成接口实现完成

## ✅ 已完成的文件

### 1. 视图层
**文件：** `interviews/resume_chat_view.py`

```python
class GenerateResumeChatView(APIView):
    """
    AI 对话式简历生成接口
    
    POST /api/v1/generate-resume-chat/
    
    请求体：
    {
        "user_message": "帮我生成一份前端工程师的简历",
        "current_resume": { /* 当前简历数据 */ },
        "chat_history": [ /* 最近10轮对话 */ ],
        "last_edited_field": "basicInfo.name"
    }
    
    响应：
    {
        "instructions": [
            {
                "action": "update",
                "path": "basicInfo.name",
                "value": "张三",
                "reason": "更新姓名"
            }
        ],
        "message": "已更新您的姓名为张三"
    }
    """
```

---

### 2. AI 服务层
**文件：** `interviews/ai_services.py`

新增函数：
- `generate_resume_chat_response()` - 主函数，调用 AI 生成响应
- `_build_resume_summary()` - 构建简历摘要
- `_compress_chat_history()` - 压缩聊天历史
- `_detect_user_intent()` - 检测用户意图

---

### 3. URL 路由
**文件：** `ai_interview_backend/urls.py`

```python
from interviews.resume_chat_view import GenerateResumeChatView

urlpatterns = [
    # ...
    path('api/v1/', include([
        # ...
        path('generate-resume-chat/', GenerateResumeChatView.as_view(), name='generate-resume-chat'),
    ])),
]
```

---

## 📡 API 详细说明

### 请求示例

```bash
curl -X POST http://localhost:8000/api/v1/generate-resume-chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_message": "帮我生成一份前端工程师的简历，我有3年工作经验，熟悉Vue、React和TypeScript",
    "current_resume": {},
    "chat_history": [],
    "last_edited_field": null
  }'
```

### 响应示例

```json
{
  "instructions": [
    {
      "action": "update",
      "path": "basicInfo",
      "value": {
        "name": "请填写姓名",
        "phone": "13800138000",
        "email": "example@email.com"
      },
      "reason": "初始化基本信息"
    },
    {
      "action": "update",
      "path": "skills",
      "value": ["Vue.js", "React", "TypeScript", "JavaScript", "HTML/CSS"],
      "reason": "根据用户描述添加技能"
    },
    {
      "action": "add",
      "path": "workExperience",
      "value": {
        "company": "某科技公司",
        "position": "前端工程师",
        "duration": "2021.01 - 至今",
        "description": [
          "负责公司核心产品的前端开发工作",
          "使用 Vue3 和 TypeScript 构建高性能的 Web 应用",
          "优化前端性能，提升用户体验30%"
        ]
      },
      "reason": "添加工作经历"
    }
  ],
  "message": "我已经为你生成了基础的简历框架，包含基本信息、技能列表和一段工作经历。你可以继续告诉我更多细节来完善简历。"
}
```

---

## 🔧 核心功能

### 1. 简历摘要生成
```python
def _build_resume_summary(resume: dict) -> str:
    """
    将完整的简历数据压缩为简短的摘要
    
    输入：
    {
        "basicInfo": {"name": "张三"},
        "skills": ["Vue.js", "React"],
        "workExperience": [...]
    }
    
    输出：
    姓名：张三
    岗位：未指定
    工作年限：2年
    统计：技能2项、工作2段、项目1个
    关键词：Vue.js, React
    """
```

### 2. 聊天历史压缩
```python
def _compress_chat_history(history: list) -> str:
    """
    压缩聊天历史，只保留最近10轮对话
    并截断过长的消息（>200字符）
    
    输入：
    [
        {"role": "user", "content": "你好"},
        {"role": "assistant", "content": "你好！我是AI助手"}
    ]
    
    输出：
    用户：你好
    AI：你好！我是AI助手
    """
```

### 3. 用户意图识别
```python
def _detect_user_intent(message: str, last_edited_field: str | None) -> str:
    """
    根据用户消息和上下文识别意图
    
    关键词匹配：
    - "生成"、"创建" → create（创建）
    - "优化"、"改进" → optimize（优化）
    - "添加"、"增加" → add（添加）
    - "删除"、"去掉" → delete（删除）
    
    输出：
    类型：create（创建新内容）
    目标：全局
    """
```

---

## 🎯 AI Prompt 设计

### 系统提示词
```
你是一个专业的简历撰写专家，擅长创建结构清晰、内容专业的简历。
你需要根据用户的要求，对简历进行增量更新，而不是重写整个简历。

输出格式要求：
1. 必须返回有效的 JSON 格式
2. 包含 instructions 数组和 message 字符串
3. instructions 中每个指令包含：action、path、value、reason
4. path 使用点号分隔，如 'basicInfo.name'
5. message 要简洁友好，告诉用户做了什么修改
```

### 用户提示词
```
## 当前简历状态
姓名：张三
岗位：前端工程师
工作年限：3年
统计：技能5项、工作2段、项目3个
关键词：Vue.js, React, TypeScript

## 最近对话
用户：你好
AI：你好！我是AI简历助手
用户：帮我优化工作经历

## 用户意图
类型：optimize（优化）
目标：workExperience

## 用户请求
帮我优化第一段工作经历，让它更专业

请根据以上信息，返回 JSON 格式的增量更新指令。
```

---

## 🧪 测试步骤

### 1. 启动后端服务
```bash
cd ai_interview_backend
python manage.py runserver
```

### 2. 测试 API
```bash
# 使用 curl 测试
curl -X POST http://localhost:8000/api/v1/generate-resume-chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_message": "帮我生成一份简历",
    "current_resume": {},
    "chat_history": [],
    "last_edited_field": null
  }'
```

### 3. 查看日志
```bash
# 后端控制台应该显示：
用户 username 发起简历对话: 帮我生成一份简历...
```

### 4. 前端测试
1. 启动前端：`npm run dev`
2. 访问：`http://localhost:5174/dashboard/generate-resume`
3. 输入消息："帮我生成一份前端工程师的简历"
4. 查看网络请求：应该看到 `POST /api/v1/generate-resume-chat/`
5. 查看响应：应该包含 `instructions` 和 `message`

---

## 📊 数据流图

```
┌─────────┐
│  前端   │
└────┬────┘
     │ POST /api/v1/generate-resume-chat/
     │ {
     │   user_message: "帮我生成简历",
     │   current_resume: {},
     │   chat_history: [],
     │   last_edited_field: null
     │ }
     ↓
┌─────────────────────────┐
│ GenerateResumeChatView  │
└────┬────────────────────┘
     │ 1. 验证请求数据
     │ 2. 记录日志
     │ 3. 调用 AI 服务
     ↓
┌─────────────────────────┐
│ generate_resume_chat_   │
│ response()              │
└────┬────────────────────┘
     │ 1. 获取 AI 配置
     │ 2. 构建简历摘要
     │ 3. 压缩聊天历史
     │ 4. 检测用户意图
     │ 5. 构建 Prompt
     ↓
┌─────────────────────────┐
│ _call_openai_api()      │
└────┬────────────────────┘
     │ 调用 DeepSeek/OpenAI
     ↓
┌─────────────────────────┐
│ AI 模型                 │
└────┬────────────────────┘
     │ 返回 JSON 指令
     ↓
┌─────────────────────────┐
│ 解析和验证响应          │
└────┬────────────────────┘
     │ {
     │   instructions: [...],
     │   message: "..."
     │ }
     ↓
┌─────────┐
│  前端   │
└─────────┘
```

---

## ⚠️ 注意事项

### 1. 认证
- 接口需要用户登录（`permissions.IsAuthenticated`）
- 请求头必须包含 `Authorization: Bearer <token>`

### 2. AI 配置
- 用户需要在系统设置中配置 AI 模型和 API Key
- 如果未配置，会使用系统默认配置
- 如果都没有，会返回错误

### 3. Token 优化
- 聊天历史只保留最近10轮对话
- 每条消息最多200字符
- 简历摘要只包含关键信息

### 4. 错误处理
```python
try:
    response = generate_resume_chat_response(...)
except Exception as e:
    logger.exception(f"简历对话生成异常: {str(e)}")
    return Response({
        'error': f'服务器内部错误: {str(e)}',
        'instructions': [],
        'message': '抱歉，AI 服务暂时不可用'
    }, status=500)
```

---

## 🎉 完成状态

- ✅ 视图层实现（`resume_chat_view.py`）
- ✅ AI 服务层实现（`ai_services.py`）
- ✅ URL 路由配置（`urls.py`）
- ✅ 请求验证
- ✅ 错误处理
- ✅ 日志记录
- ✅ Token 优化
- ✅ 意图识别
- ✅ 简历摘要
- ✅ 历史压缩

---

## 🚀 启动测试

### 1. 重启后端服务
```bash
# 停止当前服务（Ctrl+C）
# 重新启动
python manage.py runserver
```

### 2. 测试接口
```bash
# 登录获取 Token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# 使用 Token 测试简历生成
curl -X POST http://localhost:8000/api/v1/generate-resume-chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_message": "帮我生成一份前端工程师的简历",
    "current_resume": {},
    "chat_history": [],
    "last_edited_field": null
  }'
```

### 3. 前端测试
1. 刷新浏览器
2. 访问简历生成页面
3. 输入消息测试

---

## 📝 后续优化建议

### Phase 1：已完成 ✅
- ✅ 基础接口实现
- ✅ AI 调用集成
- ✅ 增量更新支持
- ✅ 错误处理

### Phase 2：可选优化
- [ ] 添加流式响应（SSE）
- [ ] 添加请求限流
- [ ] 添加缓存机制
- [ ] 添加 A/B 测试

### Phase 3：高级功能
- [ ] 多模型支持（GPT-4, Claude, 本地模型）
- [ ] 自定义 Prompt 模板
- [ ] 简历评分和建议
- [ ] 批量生成

---

## 🎯 总结

后端 AI 对话式简历生成接口已经完全实现！

**接口地址：** `POST /api/v1/generate-resume-chat/`

**功能特性：**
- ✅ 支持对话式交互
- ✅ 增量更新简历
- ✅ 智能意图识别
- ✅ Token 优化
- ✅ 完整错误处理

请重启后端服务并测试！🚀
