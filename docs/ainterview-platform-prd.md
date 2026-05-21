# AInterview 平台中期汇报 PRD

## Problem Statement

当前大学生就业市场竞争激烈，应届毕业生在简历撰写和面试表现两方面存在突出问题：简历难以凸显核心竞争力，面试因紧张和技巧不足导致发挥失常。线下专业求职指导成本高昂，无法满足应届生即时性、个性化的指导需求。需要一套 AI 驱动的全流程求职赋能平台，将简历制作和面试准备数字化、智能化，降低毕业生求职门槛和成本。

## Solution

AInterview 是一套 AI 驱动的全流程求职赋能平台，面向高校毕业生提供免费服务。平台集成 DeepSeek 大模型 API 和面部识别技术，采用前后端分离 Web 架构（Vue3 + Django DRF），核心解决三个问题：

1. **AI 模拟面试**：AI 面试官动态出题、流式追问、实时面部表情分析、语音转文字，面试后自动生成多维评估报告
2. **简历智能生成与优化**：OCR 文件解析、AI 对话式生成、多模板切换、JD 匹配诊断、中英双语支持
3. **求职成长工具**：个人看板、操作日志、博客社区、AI 参数自定义配置

让简历制作时长大幅缩短，面试准备周期压缩，预期提升简历筛选通过率与面试成功率。

## User Stories

### 用户认证

1. 作为求职者，我想要用邮箱注册账号并登录，以便使用平台的完整功能
2. 作为求职者，我想要系统记住我的登录状态（JWT Token），以便在多次访问中无需反复登录
3. 作为求职者，我想要修改我的个人信息（头像、昵称、手机号），以便完善个人资料

### AI 模拟面试

4. 作为求职者，我想要选择一个目标岗位并配置面试难度和题目数量，以便开始一场针对性的模拟面试
5. 作为求职者，我想要 AI 面试官根据我的岗位动态生成面试题目，以便获得贴合真实面试场景的练习
6. 作为求职者，我想要用语音回答面试问题（语音转文字），以便模拟真实面试的对话体验
7. 作为求职者，我想要在面试过程中实时查看面部表情识别结果，以便了解自己的情绪表现
8. 作为求职者，我想要 AI 在每道题回答后给出即时反馈，以便在面试过程中持续改进
9. 作为求职者，我想要 AI 面试官基于我的回答进行流式追问（SSE），以便体验真实面试的追问压力
10. 作为求职者，我想要在面试中途退出后能够恢复未完成的面试，以便灵活安排练习时间
11. 作为求职者，我想要查看面试历史记录，以便回顾过去的面试表现

### 智能评估报告

12. 作为求职者，我想要面试结束后自动生成一份综合评估报告，以便全面了解自己的面试表现
13. 作为求职者，我想要查看能力雷达图（5 项维度），以便直观了解自己的强项和弱项
14. 作为求职者，我想要查看面试过程中的情绪波动曲线，以便了解自己的情绪管理能力
15. 作为求职者，我想要每道面试题获得 STAR 法则格式的参考答案，以便学习更好的回答方式
16. 作为求职者，我想要查看 AI 对每个回答的 STAR 法则逐题评估，以便针对性改进

### 简历生成与管理

17. 作为求职者，我想要上传 PDF 或图片格式的简历文件并通过 OCR 自动解析，以便快速导入已有简历
18. 作为求职者，我想要通过 AI 对话的方式逐步生成简历内容，以便获得个性化指导
19. 作为求职者，我想要在多种模板之间自由切换，以便找到最适合的简历样式
20. 作为求职者，我想要在线编辑简历的各个模块，以便精细调整简历内容
21. 作为求职者，我想要导出 A4 精确分页的 PDF 简历文件，以便投递到招聘平台
22. 作为求职者，我想要 AI 诊断我的简历与目标 JD 的匹配度，以便针对性地优化简历
23. 作为求职者，我想要 AI 润色简历中的语言表述，以便提升简历的专业感
24. 作为求职者，我想要生成中英双语版本的简历，以便应对外企求职需求

### 个人成长与社区

25. 作为求职者，我想要在个人看板中看到与 AI 面试官的对话入口，以便随时获得求职建议
26. 作为求职者，我想要查看自己的操作日志（面试、简历、报告），以便追踪求职准备进度
27. 作为求职者，我想要在博客社区中浏览和发布文章（Markdown 格式），以便分享求职经验
28. 作为求职者，我想要对社区文章进行点赞、收藏和评论，以便参与社区互动
29. 作为求职者，我想要关注其他用户，以便持续获取他们的内容更新

### 系统配置

30. 作为用户，我想要自定义 AI 模型的 API Key 和默认模型选择，以便使用自己的 API 配额
31. 作为用户，我想要查看 Swagger API 文档，以便了解可用的接口

## Implementation Decisions

### 系统架构

- **前后端分离**：前端 Vue3 + Vite + Element Plus，后端 Django + Django REST Framework
- **数据库**：MySQL 8.0，使用 utf8mb4 字符集
- **缓存与消息队列**：Redis（缓存 + Channel Layer）+ RabbitMQ（Celery Broker）
- **异步任务**：Celery，处理面试报告生成、超时面试清理、博客每日统计
- **AI 集成**：通过 OpenAI 兼容接口调用 DeepSeek 大模型 API，用户可自定义 API Key
- **面部识别**：前端 face-api.js，识别 7 种基础情绪，1 秒采样间隔
- **语音识别**：浏览器 Web Speech API
- **实时通信**：SSE 用于面试答题流式推送，WebSocket（Django Channels）用于 AI 对话和用户聊天
- **API 文档**：drf-spectacular 自动生成 Swagger 文档

### 后端应用模块（11 个，9 个含完整业务模型）

| 模块 | 状态 | 职责 |
|------|------|------|
| users | 完整 | 用户模型（AbstractUser）、JWT 认证、用户信息管理 |
| interviews | 完整 | 面试会话管理、AI 动态出题/追问/反馈、报告异步生成 |
| resumes | 完整 | 简历 CRUD、PaddleOCR 解析、模板管理、结构化数据 |
| reports | 完整 | 简历分析报告（JD 匹配评分） |
| system | 完整 | AI 模型配置、API Key 管理、行业/岗位数据 |
| blog | 完整 | 文章/分类/标签、Markdown 编辑、每日统计 |
| interactions | 完整 | 点赞、收藏、关注关系 |
| notifications | 完整 | 操作日志（ActivityLog）、通知模型（Notification） |
| chat | 完整 | 用户聊天 + AI 对话、WebSocket 实时通信 |
| core | 基础设施 | 分页器、ASGI 配置（Django + FastAPI 组合路由） |
| questions | 空 | 预留模块，面试题目由 AI 动态生成 |

### 关键架构决策

- **面试出题**：全部由 AI 实时动态生成，不依赖预置题库，确保题目针对性和多样性
- **操作日志**：ActivityLog 数据通过 `build_activity_list()` 从 InterviewSession、Resume、ResumeAnalysisReport、Conversation 四张业务表实时聚合，而非直接查询 ActivityLog 表
- **报告生成**：面试结束后自动触发 Celery 异步任务，生成含能力雷达图、情绪波动曲线、STAR 法则评估的综合报告
- **简历编辑**：采用模块化编辑模式，AI 对话支持增量更新指令
- **PDF 导出**：Electron headless BrowserWindow + Chromium printToPDF 原生分页，本地 HTTP 服务（端口 9999）
- **身份认证**：django-allauth + dj-rest-auth + Simple JWT，Access Token 有效期 2 小时，Refresh Token 有效期 7 天
- **邮箱验证**：当前已关闭（ACCOUNT_EMAIL_VERIFICATION = "none"），开发便利

### API 设计

- 遵循 RESTful 规范，全局分页（StandardResultsSetPagination）
- 认证：Bearer JWT Token
- 所有接口默认要求认证（DEFAULT_PERMISSION_CLASSES = IsAuthenticated）
- 接口文档：`/api/v1/schema/swagger-ui/`

## Testing Decisions

### 测试策略

- **当前状态**：测试框架已搭建（Django TestCase + Vitest），各 app 的 tests.py 文件均为基础模板，测试用例待编写
- **测试范围**：核心流程（面试全流程、简历生成、报告生成）优先编写集成测试；AI 调用接口编写 Mock 测试
- **测试原则**：只测试外部行为，不测试实现细节；API 测试以请求-响应断言为主

### 待测试模块

- 用户注册/登录/JWT 刷新流程
- 面试会话创建/中断恢复/完成全流程
- 简历 CRUD + OCR 解析
- 报告生成与查询
- 操作日志聚合与筛选
- WebSocket 聊天连接与消息收发

## Out of Scope

- 生产环境 Docker 多服务编排部署
- HTTPS 证书配置（规划在部署阶段）
- GitHub OAuth 第三方登录（已配置但后续将删除）
- 社交通知的自动触发（Notification 模型已定义，信号/触发器未实现）
- 邮箱验证（已关闭）
- 多风格 AI 面试官切换（当前为单一固定面试官角色）
- 简历模块拖拽排序
- YOLO 人脸识别模型替换

## Further Notes

### 已确认待修复的 Bug

1. 语音识别重复追加文本（useSpeechRecognition 累积转录导致编辑器内容重复）
2. InterviewReport 接口重复声明导致 emotion_analysis 字段丢失
3. InterviewSession.duration 与 InterviewQuestion.score 字段数据填充未完成
4. ResumeGeneratorNew 中 AI 调用失败时的硬编码 Mock 数据回退
5. ActivityLog 已读标记空操作（mark_all_as_read/mark_as_read 接口未持久化 is_read 状态）

### 功能优化待办

- 简历模板渲染效果优化
- 全站 PC 端 + 移动端适配
- WebSocket 心跳检测与自动重连
- 面试报告生成时机优化（从 ReportDetail 加载时触发改为面试结束时显式调用 finish 接口）

### 已识别风险

1. PaddleOCR 对多栏布局、图文混合简历的解析准确率不足
2. DeepSeek API 调用成本和响应延迟
3. face-api.js 在不同设备/光线环境下的精度波动
4. Django Channels 在多人并发下的长连接稳定性
