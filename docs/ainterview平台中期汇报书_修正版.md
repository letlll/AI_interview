# AInterview 平台中期汇报书

> 本文档基于 `ainterview平台中期汇报书写方案_fd56b381.plan.md`，经代码库逐条验证后修正。修正项用 ~~删除线~~ 标注原文，**加粗** 标注修正后内容。

---

## 一、选题的目的和意义

当前大学生就业市场竞争激烈，应届毕业生普遍缺乏求职实战经验，在简历撰写、面试表现两大核心环节存在突出问题：简历难以凸显个人核心竞争力，面试因紧张、技巧不足导致发挥失常；线下专业求职指导成本高昂，无法满足应届生即时性、个性化的指导需求。

本项目设计并实现 AI 驱动的全流程求职赋能平台，针对高校毕业生痛点提供免费服务，将简历制作时长大幅缩短，压缩面试准备周期，有效降低学生求职成本，预期提升简历筛选通过率与面试成功率。项目采用 DeepSeek 大模型 API、面部识别技术（face-api.js），结合前后端分离 Web 架构，探索 AI 技术在高校就业服务领域的落地应用，为提升毕业生就业能力提供技术解决方案，具备实践价值与行业示范意义。

通过本项目的全流程开发，我系统掌握 Django DRF 后端开发、Vue3 前端设计、MySQL 数据库建模、异步任务处理（Celery + RabbitMQ + Redis）、AI 接口集成等核心技术，全面锻炼全栈开发与工程实践能力，为软件工程专业学习与职业发展奠定坚实基础。

---

## 二、主要研究内容

### 1. 系统架构与技术选型研究

确定前后端分离架构：

| 层级 | 技术栈 |
|------|--------|
| 前端 | Vue3 + Vite + TypeScript + Element Plus |
| 后端 | Django 5.0 + Django REST Framework |
| 数据库 | MySQL |
| 缓存 | Redis |
| 任务队列 | Celery（RabbitMQ 为 Broker，Redis 为 Result Backend） |
| 实时通信 | Django Channels + WebSocket（AI 对话） / HTTP 流式响应（面试答题流式） |
| AI 接口 | DeepSeek 大语言模型 API（通过 OpenAI SDK 调用） |
| 面部识别 | face-api.js（7 种基础情绪检测） |
| 语音识别 | 浏览器原生 Web Speech API |
| PDF 导出 | Electron headless Chromium（独立微服务，端口 9999） |
| API 文档 | drf-spectacular（Swagger UI） |

### 2. 核心功能模块设计与实现

**(1) 用户与认证系统**

实现用户注册登录、邮箱验证、密码哈希加密存储，基于 JWT（djangorestframework-simplejwt）完成身份认证与 Token 刷新机制，支持 GitHub OAuth 第三方登录（dj-rest-auth + allauth）。

**(2) AI 模拟面试系统**

实现多风格 AI 面试官配置、岗位题库匹配、实时面部表情识别（7 种情绪：平静、开心、悲伤、生气、害怕、厌恶、惊讶）、浏览器原生 Web Speech API 语音转文字、**AI 对话 WebSocket 实时通信 + 面试答题 HTTP 流式推送**、面试中断恢复（check-unfinished / abandon-unfinished）、**答题后 AI 流式反馈（HTTP 流式响应，提交答案后才开始返回）**。

**(3) 智能评估报告生成**

实现多维度评估报告通过 Celery 异步生成（综合评分 0-100、能力雷达图 5 项维度、优缺点分析、改进建议、关键词匹配分析、STAR 法则逐题评估）；完成报告详情页开发，集成 ECharts 可视化图表与情绪波动曲线；每道题支持参考答案获取（STAR 格式，1 小时 Redis 缓存）。

**(4) 简历智能生成与优化**

实现 PaddleOCR 简历文件解析（PDF/DOCX，pypdf 主路径 ~~+ 扫描件自动 OCR 回退~~，OCR 回退功能已实现但 pdf2image 依赖待安装）、对话式 AI 简历生成（增量更新指令、Token 消耗较全量减少 80%）、AI 简历诊断（JD 匹配评分与改进建议）、AI 语言润色、多模板切换与模块化拖拽编辑。

### 3. 辅助功能模块

开发个人成长看板（Dashboard）、面试历史记录、实时通知中心（操作日志聚合页：面试/简历/报告三分类型筛选）、AI 参数自定义配置页面。~~博客社区（Markdown 编辑、点赞收藏评论关注）已从前端移除，后端待删除。~~

基于 Electron headless BrowserWindow 实现简历 A4 精确分页 PDF 导出与逐页预览（本地 HTTP 微服务，端口 9999，支持 printToPDF + pdf-lib 分页解析 + 逐页截图）。

### 4. 数据库设计与系统测试

完成 MySQL 数据库表结构设计、关联关系建模与索引优化；开展单元测试、集成测试、验收测试，保障系统功能正常。

### 5. 技术保障与性能优化

遵循 RESTful 规范设计 API 接口，自动生成 Swagger 文档（drf-spectacular）；通过 HTTPS 保障数据传输安全，严格保护用户隐私；优化接口响应速度与 Celery 异步任务执行率。

---

## 三、目前已完成的情况

### 1. 系统架构与后端基础设施（100% 完成）

完成 Django 项目框架搭建，开发 **9 个核心应用模块**（users, resumes, interviews, reports, questions, system, interactions, notifications, chat），完成所有模块的数据模型、序列化器、基础 API 视图开发，完成 MySQL 数据库部署与迁移。

### 2. 用户认证与权限管理（100% 完成）

实现用户注册、登录、登出、邮箱验证功能，密码哈希加密存储；基于 JWT 实现身份认证、Token 刷新；完成用户信息管理接口开发；支持 GitHub OAuth 第三方登录。

### 3. AI 模拟面试核心功能（基本完成，端到端流程已打通）

实现面试会话管理（创建、中断恢复 check-unfinished/abandon-unfinished、缓存），AI 自动出题与流式追问推送，用户文本/语音（Web Speech API）答题后 AI HTTP 流式反馈，AI 对话 WebSocket 实时通信（Django Channels），多风格 AI 面试官配置（AISetting）；集成 face-api.js 面部表情识别（7 种基础情绪）与浏览器原生 Web Speech API 语音识别；面试结束后自动触发 Celery 异步报告生成，全流程闭环已跑通。

### 4. 智能评估报告功能（基本完成）

实现多维度评估报告异步生成（综合评分 0-100、能力雷达图 5 项维度、优缺点分析、改进建议、关键词匹配分析、STAR 法则逐题评估）；完成报告详情页开发，集成 ECharts 可视化图表与情绪波动曲线；每道题支持参考答案获取（STAR 格式，1 小时 Redis 缓存）。

### 5. 简历智能生成与管理（基本完成）

完成简历在线编辑器与预览、多模板切换、模块化拖拽编辑；实现 PaddleOCR 简历文件解析（PDF/DOCX，pypdf 文本提取主路径）；完成 AI 对话式简历生成（增量更新指令、Token 消耗较全量减少 80%）、AI 简历诊断（JD 匹配评分与改进建议）、AI 语言润色功能。~~中英双语简历生成功能已移除。~~

### 6. 辅助功能（基本完成）

完成个人成长看板（Dashboard）、面试历史记录、实时通知中心（操作日志聚合页，分类筛选：全部/面试/简历/报告）、AI 参数自定义配置页面（AISetting / AIModel）。~~博客社区功能已从前端移除。~~

### 7. 开发与部署环境（100% 完成）

集成 Swagger API 文档（drf-spectacular，地址 `/api/v1/schema/swagger-ui/`），完成前后端环境变量配置（.env），实现敏感信息统一管理；完成 Electron PDF 微服务开发（headless Chromium 渲染 + printToPDF + pdf-lib 分页解析 + 逐页截图预览，本地 HTTP 服务端口 9999，已确认正常运行）。

---

## 四、存在的问题和解决办法

### 1. ~~OCR 简历解析准确率不足~~ PaddleOCR 依赖不完整

**修正：** PaddleOCR 模块已实现且 PaddlePaddle 3.2.2 正常导入，但 `pdf2image` 依赖缺失导致扫描件 OCR 回退功能不可用。当前 pypdf 主路径可正常处理文本型 PDF；扫描版 PDF 的 OCR 回退需安装 pdf2image 后启用。

解决办法：安装 pdf2image 依赖；优化 PaddleOCR 预处理流程（灰度化、去噪、二值化）；研究 PP-OCRv5 模型参数调优；参考开源简历解析项目优化结构化提取逻辑。

### 2. AI API 调用成本较高且存在响应延迟

面试问答、简历优化等功能需要频繁调用 DeepSeek 大模型接口，Token 消耗量大，同时网络请求存在延迟，影响用户使用体验。

解决办法：为高频请求增加 Redis 缓存机制（参考答案 1 小时缓存已实现），避免重复调用接口；精简优化提示词内容，压缩无效文本，减少 Token 消耗；依托 Celery 异步任务处理 AI 分析内容，弱化延迟感知；合理规划调用配额，平衡使用成本与系统性能。

### 3. 面部识别精度不足、设备兼容性差

当前采用的 face-api.js 库在不同浏览器、不同设备以及复杂光线环境下，情绪识别效果不稳定，检测精度波动较大。`useFaceApi.ts` 中 headPose（头部姿态）检测已移除。

解决办法：学习 YOLO 人脸识别模型部署方案，后续替换升级识别模型；针对多终端、多浏览器做适配优化；开展多环境测试，调整识别参数，提升功能运行稳定性。

### 4. WebSocket 并发运行稳定性欠缺

多人同时在线使用 AI 对话时，Django Channels WebSocket 长连接通信容易出现卡顿、延迟甚至断连问题。面试答题部分使用 HTTP 流式响应（非 WebSocket），不受此问题影响。

解决办法：优化 Django Channels 配置参数，提升服务并发承载能力；增加心跳检测与重连机制，保障实时通信长效稳定；进行压力测试，排查代码缺陷与性能瓶颈。

---

## 五、下一步工作安排

### 第一阶段（核心功能 BUG 修复）

- 修复语音识别重复追加文本问题（useSpeechRecognition 累积转录导致编辑器内容重复）
- 修复 InterviewReport 接口重复声明导致 emotion_analysis 字段丢失的类型问题
- 补全 InterviewSession.duration 与 InterviewQuestion.score 字段的数据填充逻辑
- 移除 ResumeGeneratorNew 中 AI 调用失败时的硬编码 Mock 数据回退
- 安装 pdf2image 依赖，恢复扫描件 OCR 回退功能

### 第二阶段（功能优化与 UI 适配）

- 优化简历模板渲染效果
- 完成全站 PC 端 + 移动端适配
- 增加 WebSocket 心跳检测与自动重连机制
- 优化面试报告生成时机（从 ReportDetail 加载时触发改为面试结束时显式调用 finish 接口）

### 第三阶段（系统测试与部署）

- 编写核心流程单元测试与端到端集成测试
- 完成云服务器生产环境 Docker 部署
- 开展用户验收测试，收集反馈并迭代优化

### 第四阶段（毕业论文撰写）

- 同步完成毕业设计论文的框架搭建、核心章节撰写（系统设计、功能实现、测试分析）
- 中期后每周完成 2 章节内容，按期完成论文初稿

---

## 修正汇总

| # | 原文 | 修正 | 原因 |
|---|------|------|------|
| 1 | 中英双语简历生成 | 删除 | 代码中无此功能 |
| 2 | 博客社区（Markdown 编辑、点赞收藏评论关注） | 删除 | 前端已移除，后端待清理 |
| 3 | 9 个核心应用模块 | 保留（users/resumes/interviews/reports/questions/system/interactions/notifications/chat） | 去除 blog 后恰好 9 个 |
| 4 | WebSocket 实时通信 | AI 对话 WebSocket + 面试答题 HTTP 流式响应 | 面试用 HTTP 流式响应非 WebSocket |
| 5 | 实时反馈 | 答题后 AI 流式反馈（HTTP 流式响应） | 反馈在提交后非实时 |
| 6 | 语音转文字 | 浏览器原生 Web Speech API 语音识别 | 明确技术实现 |
| 7 | 扫描件自动 OCR 回退 | 功能已实现，pdf2image 依赖待安装 → 移至"存在的问题" | 依赖缺失导致不可用 |
| 8 | PaddleOCR 扫描件 OCR 回退 | 改为"存在的问题"第 1 条 | 同上 |
| 9 | OCR 简历解析准确率不足 | 改为"PaddleOCR 依赖不完整" | 更准确描述问题 |
| 10 | 电子报告定时推送 | 删除（原文档无此条但梳理时检查） | 无此功能 |
| 11 | 7 种基础情绪、1 秒采样间隔 | 保留 | 代码验证准确 |
| 12 | Redis + RabbitMQ + Celery | 保留 | 全部运行中 |
| 13 | Electron PDF 微服务 | 保留 | 端口 9999 确认运行 |
