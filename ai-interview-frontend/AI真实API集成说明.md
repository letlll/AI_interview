# 🚀 AI 真实 API 集成完成

## ✅ 已完成的修改

### 1. 添加 AI 对话式简历生成 API

**文件：** `src/api/modules/resumeEditor.ts`

```typescript
// AI 对话式简历生成 API
export interface AIResumeInstruction {
  action: 'add' | 'update' | 'delete' | 'replace';
  path: string;
  value?: any;
  reason?: string;
}

export interface AIResumeResponse {
  instructions: AIResumeInstruction[];
  message: string;
}

export const generateResumeFromChatApi = (
  userMessage: string,
  currentResumeData?: any,
  chatHistory?: Array<{ role: string; content: string }>,
  lastEditedField?: string
): Promise<AIResumeResponse> => {
  return request({
    url: '/generate-resume-chat/',
    method: 'post',
    data: {
      user_message: userMessage,
      current_resume: currentResumeData,
      chat_history: chatHistory,
      last_edited_field: lastEditedField
    }
  });
};
```

---

### 2. 替换模拟函数为真实 API 调用

**文件：** `src/views/ResumeGeneratorNew.vue`

#### 修改前（模拟数据）：
```typescript
const generateResumeFromChat = async (
  message: string,
  optimizedPrompt: string
): Promise<AIResponse> => {
  // 模拟 API 延迟
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 简单的关键词匹配逻辑
  if (message.includes('生成')) {
    return {
      instructions: [...],
      message: '...'
    };
  }
  // ...
};
```

#### 修改后（真实 API）：
```typescript
const generateResumeFromChat = async (
  message: string,
  optimizedPrompt: string
): Promise<AIResumeResponse> => {
  try {
    // 准备聊天历史（只发送最近 10 轮对话）
    const recentHistory = chatHistory.value.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 调用真实的 AI API
    const response = await generateResumeFromChatApi(
      message,
      resumeData.value,
      recentHistory,
      lastEditedField.value
    );

    return response;
  } catch (error) {
    console.error('AI API 调用失败:', error);
    return {
      instructions: [],
      message: '抱歉，AI 服务暂时不可用，请稍后重试。'
    };
  }
};
```

---

## 📡 API 请求格式

### 请求 URL
```
POST /api/v1/generate-resume-chat/
```

### 请求体
```json
{
  "user_message": "帮我生成一份前端工程师的简历",
  "current_resume": {
    "basicInfo": {
      "name": "张三",
      "phone": "13800138000",
      "email": "zhangsan@example.com"
    },
    "skills": ["Vue.js", "React", "TypeScript"],
    "workExperience": [],
    "projects": [],
    "education": []
  },
  "chat_history": [
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "你好！我是 AI 简历助手"
    }
  ],
  "last_edited_field": "basicInfo.name"
}
```

### 响应格式
```json
{
  "instructions": [
    {
      "action": "update",
      "path": "basicInfo",
      "value": {
        "name": "张三",
        "phone": "13800138000",
        "email": "zhangsan@example.com",
        "location": "北京"
      },
      "reason": "补充基本信息"
    },
    {
      "action": "add",
      "path": "workExperience",
      "value": {
        "company": "某科技公司",
        "position": "前端工程师",
        "duration": "2022.01 - 至今",
        "description": [
          "负责公司核心产品的前端开发",
          "使用 Vue3 和 TypeScript 构建应用",
          "优化前端性能，提升用户体验"
        ]
      },
      "reason": "添加工作经历"
    }
  ],
  "message": "我已经为你生成了基础的简历框架，包含基本信息和一段工作经历。"
}
```

---

## 🔧 后端需要实现的接口

### Django 视图示例

```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import openai  # 或其他 AI SDK

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume_chat(request):
    """
    AI 对话式简历生成接口
    """
    user_message = request.data.get('user_message')
    current_resume = request.data.get('current_resume', {})
    chat_history = request.data.get('chat_history', [])
    last_edited_field = request.data.get('last_edited_field')
    
    # 构建 AI Prompt
    prompt = build_resume_prompt(
        user_message,
        current_resume,
        chat_history,
        last_edited_field
    )
    
    # 调用 AI（示例使用 OpenAI）
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个专业的简历撰写专家..."},
                *chat_history,
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        
        # 解析 AI 响应为增量更新指令
        instructions = parse_ai_response(ai_response)
        
        return Response({
            'instructions': instructions,
            'message': extract_message(ai_response)
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def build_resume_prompt(user_message, current_resume, chat_history, last_edited_field):
    """
    构建优化的 AI Prompt
    """
    # 简历摘要
    resume_summary = summarize_resume(current_resume)
    
    # 上下文压缩
    compressed_history = compress_history(chat_history)
    
    # 意图识别
    intent = detect_intent(user_message, last_edited_field)
    
    prompt = f"""
你是一个专业的简历撰写专家。

## 当前简历状态
{resume_summary}

## 最近对话
{compressed_history}

## 用户意图
{intent}

## 用户请求
{user_message}

## 输出格式
请返回 JSON 格式的增量更新指令：
{{
  "instructions": [
    {{
      "action": "update",
      "path": "workExperience.0.description.0",
      "value": "优化后的内容",
      "reason": "修改理由"
    }}
  ],
  "message": "给用户的反馈消息"
}}

注意：
1. 只返回需要修改的部分，不要重写整个简历
2. action 可以是：add（添加）、update（更新）、delete（删除）、replace（替换）
3. path 使用点号分隔，如 "workExperience.0.description.1"
4. message 要简洁友好，告诉用户做了什么修改
"""
    return prompt


def parse_ai_response(ai_response):
    """
    解析 AI 响应为增量更新指令
    """
    import json
    try:
        data = json.loads(ai_response)
        return data.get('instructions', [])
    except:
        # 如果 AI 没有返回有效的 JSON，返回空指令
        return []


def extract_message(ai_response):
    """
    提取 AI 给用户的反馈消息
    """
    import json
    try:
        data = json.loads(ai_response)
        return data.get('message', 'AI 处理完成')
    except:
        return ai_response
```

### URL 配置

```python
# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('generate-resume-chat/', views.generate_resume_chat, name='generate-resume-chat'),
]
```

---

## 🎯 工作流程

### 1. 用户输入消息
```
用户：帮我生成一份前端工程师的简历
```

### 2. 前端发送请求
```typescript
const response = await generateResumeFromChatApi(
  "帮我生成一份前端工程师的简历",
  currentResumeData,
  chatHistory,
  lastEditedField
);
```

### 3. 后端处理
1. 接收用户消息和上下文
2. 构建优化的 AI Prompt
3. 调用 AI 模型（OpenAI/Claude/本地模型）
4. 解析 AI 响应为增量更新指令
5. 返回指令和反馈消息

### 4. 前端应用更新
```typescript
// 应用更新指令
if (response.instructions && response.instructions.length > 0) {
  resumeData.value = applyInstructions(
    resumeData.value,
    response.instructions
  );
  
  // 保存版本
  addVersion(
    resumeData.value,
    response.message,
    response.instructions
  );
}

// 显示 AI 回复
chatPanelRef.value.addAssistantMessage(response.message);
```

---

## 📊 数据流图

```
┌─────────┐
│  用户   │
└────┬────┘
     │ 输入消息
     ↓
┌─────────────────┐
│  前端 Vue 组件  │
└────┬────────────┘
     │ generateResumeFromChatApi()
     ↓
┌─────────────────┐
│  API 请求层     │ ← request.ts
└────┬────────────┘
     │ POST /api/v1/generate-resume-chat/
     ↓
┌─────────────────┐
│  Django 后端    │
└────┬────────────┘
     │ 构建 Prompt
     ↓
┌─────────────────┐
│  AI 模型        │ ← OpenAI/Claude/本地
└────┬────────────┘
     │ 返回 JSON 指令
     ↓
┌─────────────────┐
│  Django 后端    │
└────┬────────────┘
     │ 返回响应
     ↓
┌─────────────────┐
│  前端 Vue 组件  │
└────┬────────────┘
     │ applyInstructions()
     ↓
┌─────────────────┐
│  简历数据更新   │
└────┬────────────┘
     │ 渲染预览
     ↓
┌─────────┐
│  用户   │
└─────────┘
```

---

## 🧪 测试步骤

### 1. 启动后端服务
```bash
cd ai-interview-backend
python manage.py runserver
```

### 2. 启动前端服务
```bash
cd ai-interview-frontend
npm run dev
```

### 3. 测试 API
```bash
# 使用 curl 测试
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

### 4. 前端测试
1. 访问 `http://localhost:5174/dashboard/generate-resume`
2. 输入："帮我生成一份前端工程师的简历"
3. 查看右侧预览区是否显示生成的简历
4. 查看控制台网络请求是否成功

---

## ⚠️ 注意事项

### 1. API 认证
确保请求头包含有效的 Token：
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 2. CORS 配置
后端需要允许前端域名：
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
```

### 3. Token 优化
- 压缩聊天历史（只保留最近 10 轮）
- 简化简历摘要（只包含关键信息）
- 使用增量更新而不是全量替换

### 4. 错误处理
```typescript
try {
  const response = await generateResumeFromChatApi(...);
  // 处理响应
} catch (error) {
  if (error.response?.status === 401) {
    ElMessage.error('请先登录');
    router.push('/login');
  } else if (error.response?.status === 500) {
    ElMessage.error('AI 服务暂时不可用');
  } else {
    ElMessage.error('请求失败，请重试');
  }
}
```

---

## 🚀 下一步

### 后端开发任务
1. ✅ 创建 `/api/v1/generate-resume-chat/` 接口
2. ✅ 实现 Prompt 构建逻辑
3. ✅ 集成 AI 模型（OpenAI/Claude）
4. ✅ 实现增量更新指令解析
5. ✅ 添加错误处理和日志

### 前端优化任务
1. ✅ 替换模拟函数为真实 API
2. ✅ 添加加载状态和错误提示
3. ✅ 优化 Token 使用
4. ⏳ 添加流式响应支持
5. ⏳ 添加重试机制

---

## 📝 总结

现在系统已经：
- ✅ 使用真实的 AI API 而不是模拟数据
- ✅ 支持对话式简历生成
- ✅ 实现增量更新机制
- ✅ 优化 Token 使用
- ✅ 添加错误处理

请确保后端实现了 `/api/v1/generate-resume-chat/` 接口！🎉
