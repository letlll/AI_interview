## Problem Statement

当前 AI 简历对话 API（`generate_resume_chat_response`）存在以下问题：

1. **意图检测依赖关键词硬编码** — `_detect_user_intent()` 用 5 个 if/else 分支（生成/优化/添加/删除/查询）匹配用户输入，遇到非标准表述（如"智能医疗系统"）直接失效
2. **系统提示词平铺直叙** — 缺乏结构化分类引导，AI 不知道应该先分类再执行，输出质量波动大
3. **无记忆机制** — 每次调用传输完整简历，无缓存上次分类结果，浪费 token 且缺乏上下文连贯性
4. **无 Mode/Sub-skill 路由** — 用户说"帮我诊断简历问题"和"帮我加一段工作经历"走完全相同的 prompt 路径，AI 行为无差异化

用户期望 AI 能像 Claude Code 的分类器那样，先判断用户意图类别，再根据类别切换行为策略，实现精准、一致的响应。

## Solution

参考 Claude Code 的 `auto_mode_system_prompt.txt` 分类器架构，重构简历对话 AI 的 system prompt 为**两步内置推理模式**：

**Step 1 — 意图分类**：AI 先输出 10 个维度的 `classification` JSON
**Step 2 — 行为路由**：根据 `mode` + `sub_skill` 选择行为策略，生成 `instructions` + `message`

不增加 API 调用次数（单次调用内完成两步），通过结构化 prompt 引导 AI 自分类。

同时引入**简历记忆缓存**，存储上次分类结果，作为后续调用的上下文。

### 分类维度（10 个）

| 维度 | 值域 | 作用 |
|------|------|------|
| `intent` | content_edit / style_adjust / question / section_target | 意图大类 |
| `action` | create / update / add / delete / optimize / none | 操作类型 |
| `scope` | global / section / field | 操作范围 |
| `section_hint` | work / projects / education / skills / summary / custom / null | 目标区块 |
| `output_type` | instructions / full_resume / section_markdown / extra_styles / chat_reply | 输出管线 |
| `complexity` | simple / compound / restructure | 复杂度（控制 token 预算） |
| `needs_clarification` | bool | 是否需反问确认 |
| `language` | zh / en / mixed | 输出语言 |
| `mode` | generate / optimize / style / review / section / chat | 行为模式 |
| `sub_skill` | grill_me / to_prd / diagnose / none | 子技能路由 |

### Mode 行为策略

| Mode | 行为 | output_type |
|------|------|-------------|
| generate | 创建新内容，允许重写全文 | full_resume / section_markdown |
| optimize | 增量修改，不重写全文 | instructions |
| style | 返回 CSS 片段注入 extraStyles | extra_styles |
| review | 评价 + 建议，不直接改内容 | chat_reply |
| section | 只在指定区块操作，注入 `<!-- section:xxx -->` 标记 | instructions |
| chat | 纯问答，无修改 | chat_reply |

### Sub-skill 行为修饰

| Sub-skill | 行为 |
|-----------|------|
| grill_me | 逐项确认，一次一问，instructions 为空 |
| to_prd | 输出 PRD 文档结构，不执行修改 |
| diagnose | 先诊断再建议，只建议不修改 |
| none | 按 mode 默认行为 |

### 记忆系统

- 缓存键：基于简历 content 的姓名 + 前 4 个 `##` 标题生成稳定 key
- 缓存值：上次 `mode` / `section_hint` / `intent`
- 注入 user prompt 作为"记忆上下文"字段

## User Stories

1. As a 求职者, I want AI 能理解我说"把工作经历优化一下"和"帮我写一份简历"是不同的意图，so that 前者只改工作区块而后者生成全文
2. As a 求职者, I want 当我说"诊断我的简历"时 AI 只给建议不直接修改，so that 我可以先看分析再决定是否采纳
3. As a 求职者, I want AI 记住我上次在修改哪个区块，so that 连续对话时不需要每次都重复指定
4. As a 求职者, I want 当我说"调整字体为宋体"时 AI 返回样式修改而非内容修改，so that 样式和内容走不同的处理管线
5. As a 求职者, I want 当我的指令模糊时 AI 能够反问澄清，so that 不会产生错误的修改
6. As a 求职者, I want AI 支持 /grill-me 模式逐项确认关键修改，so that 重要修改经过我逐一审核
7. As a 求职者, I want AI 支持 /to-prd 模式输出 PRD 文档，so that 我可以用于项目规划
8. As a 开发者, I want 分类维度覆盖所有用户交互场景，so that 不需要回退到关键词硬编码
9. As a 开发者, I want 记忆缓存减少重复 token 传输，so that API 调用成本降低
10. As a 开发者, I want system prompt 结构清晰可维护，so that 新增 mode/sub_skill 只需追加节段

## Implementation Decisions

### 模块划分

| 模块 | 类型 | 说明 |
|------|------|------|
| System Prompt 常量 | 新增 | `RESUME_CHAT_SYSTEM_PROMPT` — Claude Code 风格的结构化 prompt，含角色定义、分类流程、9 维度定义、6 Mode 行为策略、子技能修饰、输出 JSON schema |
| 记忆缓存 | 新增 | `_resume_memory_cache` 字典 + `_get_memory_cache_key()` / `_get_memory_context()` / `_update_memory_cache()` 三个辅助函数 |
| API 调用函数 | 修改 | `generate_resume_chat_response()` — 使用新 prompt + 记忆上下文 + max_tokens 提升至 4096 |
| 意图检测函数 | 删除 | `_detect_user_intent()` — 由 AI 分类器替代 |

### 架构决策

- **单次调用内置分类**（非两次独立 API 调用）：Claude Code 分离分类器是为安全必须；简历场景无安全风险，内置分类更高效，零额外延迟
- **Mode 和 Sub-skill 正交**：Mode 定义行为策略，Sub-skill 叠加行为修饰。grill_me + optimize = 逐项确认的润色模式
- **记忆缓存不持久化**：进程内字典缓存，重启丢失。不存数据库（无隐私风险），token 节省效果足够
- **JSON Mode 兼容**：当模型 `supports_json_mode=True` 时启用 `response_format={"type": "json_object"}`，确保 classification + instructions 结构化输出

### System Prompt 结构（参考 Claude Code）

```
## 角色定义          → 对标 auto_mode_system_prompt.txt 的 "automated security classifier"
## 分类流程          → 对标 "Classification Process"（有序步骤）
## 分类维度          → 对标 "Decision Categories"
## Mode 行为策略     → 对标 ALLOW/BLOCK 分类层级
## 子技能行为修饰    → 对标 bashClassifier + yoloClassifier 的多分类器路由
## Section 类型识别  → 业务特有规则
## 输出格式          → JSON schema
## 关键规则          → 硬约束
```

### API 响应扩展

原有响应：
```json
{ "instructions": [...], "message": "..." }
```

新增 `classification` 字段（可选，向后兼容）：
```json
{
  "classification": { "intent": "content_edit", "mode": "optimize", ... },
  "instructions": [...],
  "message": "..."
}
```

## Testing Decisions

- 用固定简历 Markdown fixture + 典型用户输入（"优化工作经历"、"帮我写一份简历"、"诊断我的简历"等）验证返回的 classification 维度正确
- 验证 memory cache 在连续两次调用中正确传递上下文
- 验证 sub_skill=grill_me 时 instructions 为空、message 以提问结尾
- 验证 mode=style 时 output_type=extra_styles
- 验证旧版客户端不因多了 `classification` 字段而崩溃（向后兼容）

## Out of Scope

- 前端 UI 适配 mode/sub_skill（如 grill-me 的逐项确认 UI）
- 记忆持久化到数据库
- 两次独立 API 调用的分类器架构（当前单次调用已满足需求）
- `/skill` 斜杠命令的前端实现
- 面试验证（generate_first_question / generate_next_question 等）的 prompt 优化

## Further Notes

- System Prompt 中引用 Claude Code 的 `auto_mode_system_prompt.txt` 和 `permissions_external.txt` 作为设计参考
- 记忆缓存 key 基于简历内容 hash，同名同 section 结构的简历共享记忆（同一用户编辑同一份简历时命中）
- `needs_clarification=true` 是关键安全机制——防止 AI 在模糊指令下盲目修改
- 后续可扩展：前端识别 `classification.mode` 后切换 UI 面板（如 review mode 显示评分面板，style mode 显示 StyleAdjustmentPanel）
