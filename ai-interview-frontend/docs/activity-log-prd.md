# ActivityLog 持久化与通知系统改造 PRD

## Problem Statement

当前 `/dashboard/notifications` 页面的操作日志通过 `build_activity_list()` 函数实时聚合四张业务表（InterviewSession, Resume, ResumeAnalysisReport, Conversation），存在三个核心问题：

1. **已读状态无法持久化**：`mark-as-read` / `mark-all-as-read` 端点直接返回 204 不做任何存储，每次刷新页面所有记录的 `is_read` 重置为 false。
2. **查询效率低**：每次请求都要跨四张表聚合、排序、分页，随着数据量增长延迟会持续上升。
3. **无历史审计能力**：`ActivityLog` 表和模型已定义但完全闲置，数据不落地——用户删除一条 Resume 后，相关的操作记录也随之消失。

## Solution

将操作日志从"实时聚合"改为"事件写入 + 持久化查询"模式。在关键业务动作发生时显式调用 logger 函数写入 `ActivityLog` 表，viewset 改为单表查询。数据迁移脚本回填历史数据，完成后删除 `build_activity_list()` 聚合函数。

## User Stories

1. As a 平台用户, I want 操作日志在刷新页面后保留已读状态, so that 不会重复看到已处理的通知。
2. As a 平台用户, I want 一键"全部已读"后的状态持久化, so that 下次登录时通知中心是干净的。
3. As a 平台用户, I want 面试完成时自动收到报告生成通知, so that 无需手动查找报告入口。
4. As a 平台用户, I want 导出简历后该操作出现在操作日志中, so that 可以追溯历史导出记录。
5. As a 平台用户, I want AI 简历诊断完成后产生一条通知, so that 在通知列表里即可跳转查看诊断结果。
6. As a 平台用户, I want 按面试/简历/报告分类筛选操作日志, so that 快速定位特定类型的操作记录。
7. As a 平台开发者, I want 操作日志写入逻辑集中管理, so that 新增一种操作类型时只需在一个模块里加一个函数。
8. As a 平台开发者, I want ActivityLog 表有完整的历史数据, so that 数据迁移后所有历史操作可见且可查询。
9. As a 平台开发者, I want viewset 的 `list()` 方法简化为单表查询, so that 查询性能不受业务表数量影响。
10. As a 平台用户, I want AI 对话生成简历成功后该操作被记录, so that 可以追溯"通过 AI 对话生成了哪份简历"。

## Implementation Decisions

### 1. 架构决策：事件写入 + 持久化查询

采用"业务动作发生时显式写入 ActivityLog → viewset 单表查询"模式，替代当前的"请求时实时聚合四表"。

**Why**: 解决已读持久化问题的唯一可行路径；同时解耦操作日志与业务表生命周期。

### 2. 集中式 Logger 模块 (`notifications/activity_logger.py`)

8 个专用 logger 函数，每个封装一种 action_type 的 `action_data` 组装逻辑：

```python
# 函数签名（原型）

def log_interview_started(user, session) -> ActivityLog
def log_interview_completed(user, session) -> ActivityLog
def log_interview_aborted(user, session) -> ActivityLog
def log_resume_generated(user, resume, method: str) -> ActivityLog
def log_resume_saved(user, resume) -> ActivityLog
def log_resume_exported(user, resume, pages: int, download_url: str) -> ActivityLog
def log_resume_diagnosed(user, report: ResumeAnalysisReport) -> ActivityLog
def log_report_generated(user, session) -> ActivityLog
```

每个函数内部：
- 组装 `action_data` JSON（从业务对象提取必要字段）
- 确定 `resource_type` 和 `resource_id`
- 执行 `ActivityLog.objects.create(...)`
- 返回创建的日志实例

### 3. 触发点集成

| Logger 函数 | 集成位置 | 触发条件 |
|-------------|---------|---------|
| `log_interview_started` | `InterviewViewSet.start_interview` | session 创建成功后（L122-129） |
| `log_interview_completed` | `InterviewViewSet.finish` | status 设为 FINISHED 后（L216） |
| `log_interview_aborted` | `InterviewViewSet.abandon_unfinished` + force-start 逻辑 | status 设为 CANCELED 后（L82, L100） |
| `log_resume_generated` | `ResumeViewSet.create` | 文件上传 parsed（L52）、在线创建（L68） |
| `log_resume_generated` | 前端 POST `/activity-logs/log/` | AI 对话生成（前端 apply instructions 成功后） |
| `log_resume_saved` | `ResumeViewSet.update` / `partial_update` | status 变更为 published 时 |
| `log_resume_exported` | 前端 POST `/activity-logs/log/` | PDF 导出成功后 |
| `log_resume_diagnosed` | `ResumeAnalysisView.post` | `ResumeAnalysisReport.objects.create` 之后（L312） |
| `log_report_generated` | `InterviewViewSet.finish` | 同 `log_interview_completed`，连续调用 |

**AI 对话简历生成**采用前端回调模式：`chat/views.py` 的 `send_message` 不直接写日志，而是前端在成功 apply resume instructions 后调用通用日志端点。理由：Conversation 的每次 message 更新不等于一次成功的简历生成——只有前端确认 instructions 已应用才是真正的生成完成。

### 4. 通用日志端点（供前端触发）

新增 `POST /api/v1/activity-logs/log/` 端点，用于无后端 model save 触发点的操作：

```
POST /api/v1/activity-logs/log/
{
    "action_type": "resume_exported" | "resume_generated",
    "action_status": "success",
    "resource_type": "resume",
    "resource_id": "123",
    "action_data": {
        "template_name": "简约模板",
        "pages": 2,
        "download_url": "https://...",
        "method": "AI 对话生成"
    }
}
```

仅允许 `resume_exported` 和 `resume_generated` 两种 action_type 通过此端点创建——其余类型必须由后端 logger 函数写入，防止前端伪造。

### 5. Viewset 简化

`ActivityLogViewSet.list()` 改为：

```python
def list(self, request):
    queryset = ActivityLog.objects.filter(user=request.user)
    resource_type = request.query_params.get('resource_type')
    if resource_type:
        queryset = queryset.filter(resource_type=resource_type)
    # 标准 DRF 分页
    page = self.paginate_queryset(queryset)
    serializer = self.get_serializer(page, many=True)
    return self.get_paginated_response(serializer.data)
```

`mark-as-read` 和 `mark-all-as-read` 改为真实更新 `ActivityLog.is_read` 字段。

### 6. 数据迁移

编写 Django data migration（`notifications/migrations/0003_backfill_activity_logs.py`），遍历现有 InterviewSession、Resume、ResumeAnalysisReport、Conversation 数据，调用对应的 logger 函数创建 ActivityLog 行。

迁移完成后删除 `build_activity_list()` 函数。

### 7. Resume 状态变更检测

`log_resume_saved` 需要在 status 从非 published 变为 published 时触发。在 `ResumeViewSet.perform_update()` 中比较 `self.get_object().status` 和新 `serializer.validated_data` 中的 status，仅在变更为 published 时写入日志。

## Testing Decisions

### 测试原则

- 测试外部行为（API 响应、状态变更），不测试 logger 内部实现
- 每个 logger 函数测试其输入输出映射的正确性（给定业务对象，验证创建的 ActivityLog 字段）
- 集成测试验证完整链路：业务动作 → ActivityLog 写入 → API 查询返回

### 测试范围

| 模块 | 测试内容 |
|------|---------|
| `notifications/activity_logger.py` | 8 个 logger 函数的单元测试：输入正确性、action_data 完整性、边界情况（空数据） |
| `notifications/views.py` | ActivityLogViewSet 集成测试：list/filter 正确性、mark-as-read 持久化、分页、通用日志端点权限校验 |
| `interviews/views.py` | `start_interview` 和 `finish` 创建日志的集成验证 |
| `resumes/views.py` | `create` 和 `update`（published）创建日志的集成验证 |

### 现有测试情况

项目中所有 app 的 `tests.py` 文件均为空占位（仅含 `from django.test import TestCase` 注释）。本次改造将写入首批测试。

## Out of Scope

- **旧 Notification 模型清理**：现有 `Notification` 模型（社交通知：点赞、评论、关注）及其 `GenericForeignKey` 设计不属于本次改造范围。博客功能前端已移除，相关模型的后端删除是独立任务。
- **博客后端删除**：独立于本次改造，后续处理。
- **前端 UI 变更**：`NotificationList.vue` 和 `NotificationCenter.vue` 的样式和逻辑已在前期完成，本次仅需确保 API 契约不变。
- **实时推送**：操作日志不需要 WebSocket 推送，用户刷新或切换分类时拉取即可。

## Further Notes

- `ActivityLog` 表已通过 migration `0002_activitylog.py` 创建，无需新增 schema migration。
- 数据迁移需要在所有 logger 函数和 view 集成完成后执行，确保迁移脚本可调用相同的 logger 函数。
- `log_interview_completed` 和 `log_report_generated` 在 `finish` 方法中连续调用，如果其中一个失败，另一个应不受影响（使用 try/except 包裹每个调用）。
- 前端 `activityLog` store（`src/store/modules/activityLog.ts`）已就绪，`fetchNotifications`、`markAsRead`、`markAllAsRead` 等方法无需改动——仅需后端 API 返回真实的 `is_read` 状态。
