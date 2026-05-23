# PRD：AInterview 平台系统测试实现

## Problem Statement

毕业论文第六章（系统测试）需要在 6.2 节填入 28 个核心功能测试用例的执行数据（输入/预期/实际/通过），在 6.3 节分析测试结果与系统质量。当前状态：后端 9 个 app 的 `tests.py` 均为 3 行空壳（总计 27 行），前端仅 1 个 `useResumeRenderer.test.ts` 文件（105 行）。若不实现自动化测试套件，第六章数据支撑薄弱，论文整体质量不达标。

## Solution

构建完整的自动化测试套件，覆盖后端 API 层、后端服务层（AI Mock）、前端 Composable/Store/组件/E2E 全部四层。测试用例与论文 6.2 节 TC 编号一一对应，实现可重复运行、可审计追溯的测试体系。

## User Stories

### 后端测试基础设施
1. As a 开发者, I want 独立的测试 settings 配置（settings/test.py），so that 测试数据库、Celery 同步模式、快速密码哈希与开发环境完全隔离
2. As a 测试编写者, I want 全局 MockAIService 工具类，so that 所有涉及 DeepSeek API 的测试用例可以用一行代码设置预设返回值
3. As a 测试编写者, I want 共享 Factory（factory_boy）库，so that User/Session/Resume 等跨模块数据创建不重复
4. As a 测试编写者, I want 各 app 专用的 factories.py，so that 模块特有模型（InterviewQuestion/ResumeAnalysisReport 等）的创建逻辑就近维护

### 用户认证测试（TC-AUTH-01~05）
5. As a 新用户, I want 邮箱注册功能经过自动化测试验证，so that 注册成功/自动登录/Token 返回的流程不退化
6. As a 已注册用户, I want 登录功能经过自动化测试验证，so that Token 签发与 401 错误提示始终正确
7. As a 用户, I want Refresh Token 刷新机制经过自动化测试，so that 7 天免登录体验不被破坏

### AI 模拟面试测试（TC-INTV-01~09）
8. As a 面试者, I want 面试创建流程经过全链路测试（Mock AI 出题 → 数据库写入 → JSON 结构断言），so that 首题生成的可靠性可度量
9. As a 面试者, I want 未完成面试检测逻辑经过自动化测试，so that 中断恢复弹窗的触发条件永不失效
10. As a 面试者, I want 答题提交流程经过流式 SSE 全内容验证（收集 chunk → 解析 data: 行 → 断言 JSON 完整性），so that 追问流式生成不会丢失字段
11. As a 面试者, I want 面试结束 → 状态更新 → 报告生成链路经过自动化测试，so that InterviewSession.report JSON 字段结构正确
12. As a 面试者, I want 面试中断恢复经过完整模拟测试（Client() 新实例 = 新浏览器 → check-unfinished → 数据完整性断言），so that 恢复后题目索引和已答数据一致
13. As a 面试者, I want 放弃面试流程经过自动化测试，so that 状态更新和资源清理正确

### 简历管理测试（TC-RES-01~08）
14. As a 求职者, I want 简历 CRUD API 经过完整验证（创建/编辑/删除/查询），so that 结构化字段与 JSON 灵活字段的读写一致
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
23. As a 前端开发者, I want 所有 Composable 纯函数经过 vitest 测试，so that Token 解析/日期格式化/PDF HTML 构建等核心逻辑可独立验证
24. As a 前端开发者, I want Pinia Store（authStore/interviewStore/resumeStore）actions 经过测试，so that 状态流转（pending→running→finished、登录/过期/刷新）不退化
25. As a 前端开发者, I want 关键 Vue 组件（LoginForm/InterviewQuestion/FeedbackPanel/ResumeEditor）的渲染和交互经过 Vue Test Utils 测试，so that 表单验证、状态切换、错误提示正确
26. As a 测试工程师, I want E2E 测试覆盖登录→面试→报告和简历上传→编辑→导出两条核心用户路径，so that 跨页面流程端到端可验证

## Implementation Decisions

### 1. 测试深度标准

每个核心测试用例达到 200 行级别：Mock 外部依赖（AI/OCR/PDF 微服务）→ 执行完整 API 调用 → 验证 HTTP 状态码 → 验证 Response JSON 结构 → 验证数据库写入（含 JSONField 内部字段断言）→ 验证关联表级联更新。

### 2. 后端文件组织（按 TC 编号）

每个 app 的 `tests.py` 替换为 `tests/` 包：

```
interviews/tests/
  __init__.py
  test_tc_intv_01.py   # 创建面试
  test_tc_intv_02.py   # 未完成面试检测
  test_tc_intv_03.py   # 提交答案与追问
  test_tc_intv_04.py   # 面试结束
  test_tc_intv_05.py   # 面部表情监测（后端部分）
  test_tc_intv_06.py   # 语音识别（后端部分）
  test_tc_intv_07.py   # AI 参考答案
  test_tc_intv_08.py   # 中断恢复
  test_tc_intv_09.py   # 放弃面试
  factories.py          # InterviewSession/Question Factory
```

全局共享测试基础设施位于：

```
ai_interview_backend/tests/
  __init__.py
  mock_ai_service.py    # 全局 Mock AI（set_response + side_effect）
  factories.py           # User 等跨模块 Factory
  conftest.py            # pytest fixtures（可选）
ai_interview_backend/settings/
  test.py                # 测试专用 settings
```

### 3. 前端文件组织（按层次分目录 + TC 编号前缀）

```
src/__tests__/
  composables/
    TC-AUTH-04.useTokenRefresher.test.ts
    TC-INTV-03.useSSE.test.ts
    TC-RES-06.useResumeTemplate.test.ts
  stores/
    TC-AUTH-01.authStore.test.ts
    TC-INTV-02.interviewStore.test.ts
    TC-INTV-03.interviewStore.test.ts
    TC-RES-04.resumeStore.test.ts
  components/
    TC-AUTH-01.LoginForm.test.ts
    TC-INTV-03.InterviewQuestion.test.ts
    TC-INTV-03.FeedbackPanel.test.ts
    TC-RES-08.PdfPreview.test.ts
  e2e/
    TC-INTV-flow.interview-full-flow.spec.ts
    TC-RES-flow.resume-full-flow.spec.ts
```

### 4. MockAIService 设计

全局工具类，统一封装 AI 调用 mock 行为：

- `MockAIService.set_response(scene: str, **overrides)` —— 为指定场景设置预设返回值
- `MockAIService.enable()` / `MockAIService.disable()` —— 激活/停用全局 mock
- 错误模拟通过标准 `unittest.mock.side_effect` 抛异常
- 支持 6 类场景：`interview_question`、`interview_feedback`、`resume_generate`、`resume_chat`、`jd_match`、`reference_answer`

### 5. Factory 策略

- 跨模块共享的模型（User）放在 `ai_interview_backend/tests/factories.py`
- 各 app 特有模型放在 `app/tests/factories.py`
- 使用 `factory_boy` 库，支持 JSONField 自定义构建
- 引用数据（IndustryCategory/InterviewPosition/AIModel）在 `setUpTestData` 中创建

### 6. 测试数据库

使用真实 MySQL（非 SQLite），确保 JSON 字段查询行为与生产一致。

### 7. 硬件依赖策略

TC-INTV-05（面部表情）、TC-INTV-06（语音识别）、TC-RES-01/02（OCR 解析）采用分层验证：
- 后端全自动化：验证 API 接口、数据存储结构（analysis_data JSON 格式、OCR 结果解析）
- 前端手动测试：摄像头/麦克风/真实文件上传

### 8. SSE 流式验证策略

收集 SSE 响应的全部 chunk，解析 `data:` 行前缀，拼接成完整 JSON 后断言字段完整性（题目结构、追问上下文 token 管理）。

### 9. 中断恢复模拟

利用 Django `Client` 无状态特性 —— `self.client = Client()` 后发起请求等价于新浏览器，用于模拟"关闭浏览器后重新登录"场景。

### 10. 执行顺序

| 阶段 | 内容 | 文件数 |
|------|------|--------|
| P0 | 基础设施：`settings/test.py`、`mock_ai_service.py`、`factories.py` | 3 |
| P1 | 独立模块：AUTH(5) + LOG(3) + CFG(3) 共 11 个后端测试 | 11 |
| P2 | 核心流程：INTV(9) + RES(8) 共 17 个后端测试 | 17 |
| P3 | 前端四层：Composable + Store + 组件 + E2E | ~20 |

## Testing Decisions

### 好测试的标准

- 只测试**外部可观察行为**（HTTP 状态码、Response 结构、数据库状态），不测试内部私有方法
- 每个测试用例与论文 6.2 表格的 TC 编号**一一对应**，文件命名直接使用 TC 编号
- 深度断言：不仅验证 `status_code == 200`，还要深入 Response JSON 和数据库 JSONField 的内部字段
- Mock 边界明确：只 Mock 外部服务（AI/OCR/PDF 微服务），内部 Django 逻辑全链路真跑

### 测试模块清单

| 模块 | 用例数 | 类型 | 文件位置 |
|------|--------|------|----------|
| 用户认证 | 5 | 后端 | `users/tests/test_tc_auth_*.py` |
| AI 模拟面试 | 9 | 后端 + 前端 | `interviews/tests/` + `src/__tests__/` |
| 简历管理 | 8 | 后端 + 前端 | `resumes/tests/` + `src/__tests__/` |
| 操作日志 | 3 | 后端 | `notifications/tests/test_tc_log_*.py` |
| AI 参数配置 | 3 | 后端 | `system/tests/test_tc_cfg_*.py` |

### 现有测试参考

- 后端：无（9 个 tests.py 均为空壳）
- 前端：`src/composables/__tests__/useResumeRenderer.test.ts`（105 行，11 个 test case）可作为 Composable 层测试风格参考

## Out of Scope

- 性能测试、压力测试、负载测试
- face-api.js 浏览器端面部检测的自动化测试
- Web Speech API 浏览器端语音识别的自动化测试
- 真实文件 OCR 解析的端到端测试
- CI/CD 流水线配置
- 代码覆盖率平台集成

## Further Notes

- 测试数据严禁依赖生产数据库 snapshot
- `MockAIService` 的初始实现需在编写第一个 INTV 测试前完成
- 前端 E2E 测试建议使用 Playwright，可复用 Vue DevTools 选择器
- 测试代码自身无需测试
- 所有测试统一使用 `python manage.py test --settings=ai_interview_backend.settings.test` 命令运行
- 论文 6.3 节"测试结果分析"数据可从此套件运行输出中直接提取（通过率、失败原因）
