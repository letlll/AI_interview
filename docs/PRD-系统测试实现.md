# PRD：AInterview 平台系统测试套件

## Problem Statement

毕业论文第六章（系统测试）需要在 6.2 节填入 28 个核心功能测试用例的执行数据（输入/预期/实际/通过），在 6.3 节分析测试结果与系统质量。当前状态：后端 9 个 app 的 `tests.py` 均为 3 行空壳（总计 27 行），前端仅 1 个 `useResumeRenderer.test.ts` 文件（105 行）。若不实现自动化测试套件，第六章数据支撑薄弱，论文整体质量不达标。

## Solution

构建完整的自动化测试套件，覆盖后端 API 层、后端服务层（AI Mock）、前端 Composable/Utils 层。测试用例与论文 6.2 节 TC 编号一一对应，实现可重复运行、可审计追溯的测试体系。

## User Stories

### 后端测试基础设施
1. As a 测试编写者, I want 全局 MockAIService 工具类，so that 所有涉及 DeepSeek API 的测试用例可以用一行代码设置预设返回值
2. As a 测试编写者, I want MockAIService 自动识别调用场景（`_detect_scene()`），so that 无需在每个测试中手动指定 patch 目标
3. As a 测试编写者, I want 各 app 专用的 factories.py，so that 模块特有模型（InterviewQuestion/ResumeAnalysisReport 等）的创建逻辑就近维护
4. As a 测试编写者, I want 独立的测试 settings 配置，so that 测试数据库、Celery 同步模式、快速密码哈希与开发环境完全隔离

### 用户认证测试（TC-AUTH-01~05）
5. As a 新用户, I want 邮箱注册功能经过自动化测试验证，so that 注册成功/自动登录/Token 返回的流程不退化
6. As a 已注册用户, I want 登录功能经过自动化测试验证，so that Token 签发与 401 错误提示始终正确
7. As a 用户, I want Refresh Token 刷新机制经过自动化测试，so that 7 天免登录体验不被破坏

### AI 模拟面试测试（TC-INTV-01~09）
8. As a 面试者, I want 面试创建流程经过全链路测试（Mock AI 出题 → 数据库写入 → JSON 结构断言），so that 首题生成的可靠性可度量
9. As a 面试者, I want 未完成面试检测逻辑经过自动化测试，so that 中断恢复弹窗的触发条件永不失效
10. As a 面试者, I want 答题提交流程经过流式全内容验证，so that 追问流式生成不会丢失字段
11. As a 面试者, I want 面试结束 → 状态更新 → 报告生成链路经过自动化测试，so that feedback JSON 字段结构正确
12. As a 面试者, I want 面试中断恢复经过完整模拟测试（新 Client = 新浏览器 → check-unfinished → 数据一致性断言），so that 恢复后题目索引和已答数据一致
13. As a 面试者, I want 放弃面试流程经过自动化测试，so that 状态更新和缓存清理正确

### 简历管理测试（TC-RES-01~08）
14. As a 求职者, I want 简历 CRUD API 经过完整验证，so that 结构化字段与 JSON 灵活字段的读写一致
15. As a 求职者, I want AI 简历初始生成经过 Mock 验证，so that 返回的 resume_json 结构完整
16. As a 求职者, I want AI 对话式简历编辑经过增量更新验证，so that delta JSON 正确合并到现有简历
17. As a 求职者, I want 简历诊断（JD 匹配）流程经过自动化测试，so that 评分计算和匹配建议可靠
18. As a 求职者, I want 简历模板切换逻辑经过自动化测试，so that CSS 注入顺序（RESUME_CSS → reset → theme → custom）不变

### 操作日志测试（TC-LOG-01~03）
19. As a 用户, I want 操作日志自动记录机制经过测试验证，so that 面试/简历/报告三类操作均正确记录
20. As a 用户, I want 日志筛选与已读标记经过自动化测试，so that 分类过滤和批量已读逻辑正确

### AI 参数配置测试（TC-CFG-01~03）
21. As a 管理员, I want AI 模型 CRUD 经过自动化测试，so that 模型配置变更生效
22. As a 用户, I want API Key 配置与环境变量回退逻辑经过测试，so that Key 优先级顺序正确

### 前端测试
23. As a 前端开发者, I want useResumeAI 的所有纯函数经过 vitest 测试，so that 意图识别/digest/instructions/压缩对话等核心逻辑可独立验证
24. As a 前端开发者, I want useResumeRenderer 的 buildPdfHtmlDocument 经过 vitest 测试，so that CSS 注入顺序和 Markdown 渲染正确
25. As a 前端开发者, I want useVersionHistory 的版本快照与重建逻辑经过测试，so that 增量/完整快照策略不退化
26. As a 前端开发者, I want useResumeTheme 的主题切换与 customStyles 计算经过测试，so that extraStyles computed 行为正确
27. As a 前端开发者, I want formatDateTime 和 jsonToResumeMarkdown 等工具函数经过测试，so that 边界情况（null/undefined/空值）正确兜底

## Implementation Decisions

### 1. 后端文件组织（按 TC 编号）

每个 app 的 `tests.py` 替换为 `tests/` 包，文件命名直接使用 TC 编号：

```
interviews/tests/
  test_tc_intv_01.py ~ test_tc_intv_09.py
  factories.py
  conftest.py

resumes/tests/
  test_tc_res_01.py ~ test_tc_res_08.py
  factories.py

users/tests/
  test_tc_auth_01.py ~ test_tc_auth_05.py

notifications/tests/
  test_tc_log_01.py ~ test_tc_log_03.py

system/tests/
  test_tc_cfg_01.py ~ test_tc_cfg_03.py
```

全局共享测试基础设施：

```
ai_interview_backend/tests/
  mock_ai_service.py    # 全局 Mock AI
  factories.py           # User 等跨模块 Factory
```

### 2. MockAIService 设计

全局工具类，统一封装 AI 调用 mock 行为：
- 支持 6 类场景：`interview_question`、`interview_followup`、`interview_feedback`、`resume_generate`、`resume_chat`、`jd_match`、`reference_answer`
- `set_response(scene, **overrides)` —— 为指定场景设置预设返回值
- `enable()` / `disable()` —— 激活/停用全局 mock（`unittest.mock.patch` 拦截 `openai.resources.chat.completions.Completions.create`）
- `enable()` 时自动调用 `_ensure_ai_model()` 在测试数据库中创建默认 AIModel 记录
- `_detect_scene(messages)` —— 根据 system/user prompt 关键词自动识别调用场景（优先级：面试 > 参考回答 > 简历 > JD匹配 > 反馈 > 默认）
- `_mock_create()` —— 检查 `stream` 参数自动切换流式/非流式返回
- `_build_streaming_chunks()` —— 模拟流式 chunk 列表（4 段分块，最后一段 `finish_reason='stop'`）
- 错误模拟通过标准 `unittest.mock.side_effect` 抛异常

### 3. 场景检测逻辑

`_detect_scene()` 方法的关键词检测按以下优先级排序（顺序决定检测准确性）：

1. **面试类**（`面试题目`、`出题`、`追问`、`下一道`）→ interview_question / interview_followup
2. **参考回答类**（`参考答案`、`STAR`、`参考回答`、`reference`）→ reference_answer（必须在简历检测之前）
3. **简历类**（`简历`、`resume`）— 带否定关键词过滤器（`未提供简历`、`未上传简历`、`没有简历`、`无简历`、`without resume`、`no resume` 等）
   - 子检测：JD/岗位描述 → jd_match（优先于 resume_chat）
   - 子检测：对话/编辑/修改/增量 → resume_chat
   - 子检测：生成/generate/创建 → resume_generate
4. **反馈类**（`反馈`、`评分`、`评估回答`）→ interview_feedback（必须在简历检测之后）
5. **默认** → interview_question

### 4. 流式响应测试策略

Django 的 `APIClient` 不会主动消费 `StreamingHttpResponse.streaming_content`。需要在测试中显式调用 `b"".join(resp.streaming_content)` 触发 Generator 中的 side effects（如追问文本持久化到数据库）。

### 5. 中断恢复模拟

利用 Django `APIClient` 无状态特性——创建新的 `APIClient()` 实例并重新认证后发起请求等价于"新浏览器"，用于模拟"关闭浏览器后重新登录"场景。通过 Django 的 LocMemCache 验证跨客户端的缓存共享。

### 6. 测试数据库

使用真实 MySQL（`ainterview_test` 数据库），确保 JSON 字段查询行为、UUID 类型处理与生产环境一致。非 SQLite（SQLite 的 JSON 查询语义与 MySQL 有差异）。

### 7. 前端测试组织

```
src/composables/__tests__/
  useResumeAI.test.ts          # 35 tests — 意图识别/digest/instructions/压缩
  useResumeRenderer.test.ts    # 11 tests — PDF HTML 构建/CSS 顺序/Markdown 渲染
  useResumeTheme.test.ts       # 10 tests — 主题切换/customStyles/class 参考
  useVersionHistory.test.ts    # 11 tests — 快照/重建/回退/限额

src/utils/__tests__/
  format.test.ts               # 8 tests — 日期格式化/空值/异常
  resumeMarkdown.test.ts       # 5 tests — JSON↔Markdown
```

## Testing Decisions

### 好测试的标准

- 只测试外部可观察行为（HTTP 状态码、Response JSON 结构、数据库写入状态），不测试内部私有方法
- 每个测试用例与论文 6.2 表格的 TC 编号一一对应，文件命名直接使用 TC 编号
- 深度断言：不仅验证 `status_code == 200`，还需深入 Response JSON 和数据库 JSONField 的内部字段
- Mock 边界明确：只 Mock 外部服务（AI/OCR/PDF 微服务），内部 Django 逻辑全链路真跑

### 测试模块清单

| 模块 | TC 编号 | 类型 | 用例数 | 位置 |
|------|--------|------|--------|------|
| 用户认证 | AUTH-01~05 | 后端 API | 29 | `users/tests/` |
| AI 模拟面试 | INTV-01~09 | 后端 API | 44 | `interviews/tests/` |
| 简历管理 | RES-01~08 | 后端 API | 45 | `resumes/tests/` |
| 操作日志 | LOG-01~03 | 后端 API | 15 | `notifications/tests/` |
| AI 参数配置 | CFG-01~03 | 后端 API | 14 | `system/tests/` |
| 简历 AI 逻辑 | RES-05,08 | 前端 Composable | 35 | `useResumeAI.test.ts` |
| 简历渲染 | RES-03,08 | 前端 Composable | 11 | `useResumeRenderer.test.ts` |
| 版本历史 | RES-05 | 前端 Composable | 11 | `useVersionHistory.test.ts` |
| 主题管理 | RES-05,06 | 前端 Composable | 10 | `useResumeTheme.test.ts` |
| 工具函数 | — | 前端 Utils | 13 | `format.test.ts`, `resumeMarkdown.test.ts` |

### 现有测试参考

- 后端：无（9 个 tests.py 均为空壳，从头构建）
- 前端：`src/composables/__tests__/useResumeRenderer.test.ts`（105 行，11 个 test case）作为 Composable 层测试风格参考

## Out of Scope

- 性能测试、压力测试、负载测试
- face-api.js 浏览器端面部检测的自动化测试
- Web Speech API 浏览器端语音识别的自动化测试
- 真实文件 OCR 解析的端到端测试（使用 Mock 替代）
- CI/CD 流水线配置
- 代码覆盖率平台集成
- 前端 Pinia Store 测试（需 jsdom + Vue Test Utils 环境）
- 前端 Vue 组件测试（需 @vue/test-utils + jsdom）
- E2E 跨页面流程测试（需 Playwright/Cypress）

## Further Notes

- 测试数据严禁依赖生产数据库 snapshot
- 所有后端测试统一使用 `python manage.py test --settings=ai_interview_backend.settings.test` 命令运行
- 所有前端测试统一使用 `npx vitest run` 命令运行
- MockAIService 的场景检测逻辑（`_detect_scene`）的优先级顺序是经过 7 轮调试修正后的最终结果，任何新增场景或修改默认响应时需优先验证检测逻辑
- 论文 6.2 节表中 TC-INTV-05、TC-INTV-06、TC-RES-01、TC-RES-02 依赖硬件设备（摄像头、麦克风、物理文件，涉及浏览器能力），后端测试仅验证数据存储结构（analysis_data JSON 格式、answer_text 保存、解析接口契约），完整功能验证在手工验收测试中完成
