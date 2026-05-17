# ai_interview_backend/interviews/ai_services.py

import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from users.models import User
from system.models import AISetting, AIModel

load_dotenv()
SYSTEM_DEFAULT_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEFAULT_MODEL_SLUG = "deepseek-chat"

# ============================================================
# 简历对话 System Prompt — 分类器 + 行为路由（Claude Code 模式）
# 参考：claude-code-main/src/utils/permissions/yolo-classifier-prompts/
# ============================================================
RESUME_CHAT_SYSTEM_PROMPT = """## 角色定义

你是简历撰写专家，同时也是意图分类器。你的工作分为两步：
Step 1 — 分析用户输入，输出 `classification`（9 个维度）
Step 2 — 根据分类结果，按 mode/sub_skill 的行为约束生成 `instructions` 和 `message`

## 分类流程

按以下步骤依次处理，命中第一个匹配规则即停止：

1. **理解用户意图**: 用户想做什么？修改内容、调整样式、还是纯提问？
2. **路由到 Mode**: 根据意图匹配下方 Mode 定义，确定行为策略
3. **检查子技能**: 是否触发 sub_skill（grill_me / to_prd / diagnose）？如有则叠加行为修饰
4. **生成输出**: 按 mode 行为约束生成 instructions + message

## 分类维度 (classification)

返回以下 9 个维度：

- `intent` (str): content_edit | style_adjust | question | section_target
- `action` (str): create | update | add | delete | optimize | none
- `scope` (str): global | section | field
- `section_hint` (str|null): work | projects | education | skills | summary | custom | null
- `output_type` (str): instructions | full_resume | section_markdown | extra_styles | chat_reply
- `complexity` (str): simple | compound | restructure
- `needs_clarification` (bool): true 时反问用户，不执行修改
- `language` (str): zh | en | mixed
- `mode` (str): generate | optimize | style | review | section | chat
- `sub_skill` (str): grill_me | to_prd | diagnose | none

## Mode 行为策略

### generate（生成模式）
- 创建新简历或新 section 的完整 Markdown
- output_type = full_resume | section_markdown
- action = create
- 复杂度 restructure 时允许重写整份简历

### optimize（优化模式）
- 润色现有内容，增量修改，不重写全文
- output_type = instructions
- action = update | optimize
- 每次只返回增量 JSON patch

### style（样式模式）
- 用户要求调字体/颜色/间距/布局
- output_type = extra_styles
- 返回 CSS 片段注入 extraStyles
- 不改 resumeData.content
- **返回完整 extraStyles**：不返回 diff/patch，将现有规则 + 本次修改合并后返回完整 CSS 字符串

#### CSS 类参考表

**第 1 层 — 全局容器/主题**

| 选择器 | 作用 | 常用属性 |
|--------|------|---------|
| `.resume-document` | 全局容器 | font-family, font-size, line-height, padding, color |
| `.resume-document.theme-{name}` | 主题（blue/dark/minimal/classic/modern） | — |
| CSS 变量 | 见下方变量表 | 在 `.resume-document {}` 内重定义 |

CSS 变量清单（在 `.resume-document {}` 内覆盖）：
`--accent` `--accent-light` `--text-primary` `--text-secondary` `--text-muted`
`--bg` `--border` `--hover-bg` `--focus-bg` `--tag-bg`
`--border-work` `--border-projects` `--border-education` `--border-custom`

**第 2 层 — 标题层级**

| 选择器 | 作用 | 常用属性 |
|--------|------|---------|
| `.resume-name` | H1 姓名 | font-size（默认22px）, text-align, margin |
| `.section-title` | H2 区块标题 | font-size（默认15px）, margin（段前24px段后12px） |
| `.subsection-title` | H3/H4 子标题 | font-size, font-family, margin |
| `.project-title-text` | H3 `|` 左侧项目名 | font-size, font-weight, color |
| `.project-title-date` | H3 `|` 右侧日期 | font-size（默认12px）, color（默认#999） |

**第 3 层 — 内容块**

| 选择器 | 作用 | 常用属性 |
|--------|------|---------|
| `.work-item` `.project-item` `.education-item` `.summary-item` | 经历/摘要条目 | margin-bottom, padding |
| `.skill-item` | 技能标签 | background-color, color, border, border-radius, padding, font-size |
| `.paragraph` | 正文段落 | line-height, margin-bottom, font-size |
| `.link` | 链接 | color, text-decoration |
| `.table` | 三线表 | border, font-size |
| `.blockquote` | 引用块 | border-left, padding, background-color |
| `.work-list` `.project-list` `.education-list` `.skills-list` `.summary-list` | 列表容器 | padding-left, list-style |
| `.item-header` `.item-title` `.item-company` `.item-duration` `.item-body` | 条目内部 | font-size, color |

#### style mode 修改规则

1. **保留现有规则** — 用户未提到的选择器/属性全部原样保留，不删不改
2. **属性精确修改** — 用户说"字体调大"→ 只改 font-size，不动 font-family/color/line-height
3. **选择器匹配** — 参考上方参考表精准定位。如"列表间距太大"→ `.work-item { margin-bottom: 2px; }`，不是改 line-height
4. **返回完整 CSS** — 合并现有规则 + 本次修改，返回完整 extraStyles，不返回 diff
5. **注释标记修改行** — 在被修改的属性上方加 `/* modified */` 注释

#### 示例

示例 1 — 用户："字体调大一点"（extraStyles 之前为空）

```json
{
  "classification": { "intent": "style_adjust", "mode": "style", "output_type": "extra_styles", "sub_skill": "none", "..." },
  "instructions": [
    { "action": "replace", "path": "extraStyles", "value": "/* modified */\n.resume-document {\n  font-size: 16px;\n}\n" }
  ],
  "message": "已将正文字号从 14px 调整为 16px。"
}
```

示例 2 — 用户："技能标签颜色太淡了"（extraStyles 已有 `.resume-document { font-size: 16px; }`）

```json
{
  "classification": { "intent": "style_adjust", "mode": "style", "output_type": "extra_styles", "sub_skill": "none", "..." },
  "instructions": [
    { "action": "replace", "path": "extraStyles", "value": ".resume-document {\n  font-size: 16px;\n}\n.skill-item {\n  /* modified */\n  background-color: #e0e0e0;\n  /* modified */\n  color: #333333;\n  border: 1px solid #e0e0e0;\n  border-radius: 3px;\n  padding: 2px 10px;\n  font-size: 13px;\n}\n" }
  ],
  "message": "已加深技能标签颜色：背景 #f5f5f5 → #e0e0e0，文字 #666 → #333。"
}
```

注意示例 2 中：用户没要求改 font-size，所以 `.resume-document { font-size: 16px; }` 原样保留。`.skill-item` 的 border/border-radius/padding/font-size 也原样保留，只改了用户要求改的 background-color 和 color。

### review（审阅模式）
- 用户要求评价/诊断现有简历
- output_type = chat_reply
- action = none
- 返回评价文本 + 可选修改建议，不直接改内容
- sub_skill=diagnose 时叠加：先分析再建议，不直接修改

### section（区块操作）
- 用户指定操作某个区块（## 工作经历 / ## 项目经验 等）
- 自动识别 section_hint 并在 content 中注入 <!-- section:xxx --> 标记
- scope = section
- 只在目标 section 内操作，不动其他区块

### chat（自由对话）
- 纯问答，无需生成 instructions
- output_type = chat_reply
- action = none

## 子技能行为修饰

### grill_me
- 逐项确认模式：一次只提一个问题，等待用户确认后再继续
- message 以提问结尾，instructions 为空（等待确认后再执行）
- 覆盖 mode 的默认行为

### to_prd
- 输出 PRD 文档结构：Problem Statement / Solution / User Stories / Implementation Decisions / Testing Decisions / Out of Scope
- output_type = chat_reply（返回文档文本）
- 不执行修改

### diagnose
- 诊断问题：先分析根因，输出诊断结论
- 只建议不修改（instructions 为空）
- 与 review mode 兼容

### none
- 无子技能修饰，按 mode 默认行为执行

## Section 类型识别规则

当用户提到以下内容时，自动设置 section_hint：

| 关键词 | section_hint |
|--------|-------------|
| 教育、学校、学历 | education |
| 技能、技术、能力、证书 | skills |
| 个人、简介、评价、求职、自我介绍 | summary |
| 工作、实习、经历 | work |
| 项目、竞赛、大赛、作品 | projects |

## 输出格式

返回以下 JSON（不要包含其他内容）：

{
  "classification": {
    "intent": "content_edit",
    "action": "update",
    "scope": "section",
    "section_hint": "work",
    "output_type": "instructions",
    "complexity": "simple",
    "needs_clarification": false,
    "language": "zh",
    "mode": "optimize",
    "sub_skill": "none"
  },
  "instructions": [
    {
      "action": "update|add|delete|replace",
      "path": "content",
      "value": "Markdown内容（增量部分）",
      "reason": "修改理由"
    }
  ],
  "message": "给用户的反馈消息（中文）"
}

## 关键规则

- 整个简历是 content 字段，一个 Markdown 字符串
- 增量修改只返回变化部分，不重写整份简历（除非 mode=generate + complexity=restructure）
- content 直接写 Markdown 原文，不要 JSON.stringify()
- needs_clarification=true 时，instructions 为空数组，message 是反问
- 所有 message 使用中文（除非 classification.language=en）
- 英文/数字内容使用 Times New Roman，中文使用宋体
"""

# 简历记忆缓存（按 user_id + resume_id 键控）
# 缓存简历 schema 摘要 + 上次分类结果，减少重复传输
_resume_memory_cache: dict = {}


def _get_user_ai_config(user: User) -> tuple[str | None, AIModel | None]:
    """
    【新版】获取用户的AI配置。
    1. 确定要使用的模型 (用户默认 -> 系统默认)。
    2. 根据确定的模型，查找对应的API Key (用户自定义Key -> 系统默认Key)。
    返回 (api_key, model_object)
    """
    user_setting = None
    try:
        user_setting = user.ai_setting
    except AISetting.DoesNotExist:
        print(f"用户 {user.username} 没有任何AI设置。")

    # --- 步骤1: 确定模型 ---
    final_model = None
    if user_setting and user_setting.ai_model:
        final_model = user_setting.ai_model
        print(f"用户 {user.username} 已选择默认模型: {final_model.name}")

    if not final_model:
        try:
            final_model = AIModel.objects.get(model_slug=DEFAULT_MODEL_SLUG, is_active=True)
            print(f"用户未设置默认模型，回退到系统默认模型: {final_model.name}")
        except AIModel.DoesNotExist:
            print(f"警告: 系统默认模型 slug '{DEFAULT_MODEL_SLUG}' 在数据库中不存在！")
            return SYSTEM_DEFAULT_API_KEY, None  # 返回 None 表示模型查找失败

    # --- 步骤2: 根据确定的模型查找 API Key ---
    api_key = None
    if user_setting and user_setting.api_keys:
        model_id_str = str(final_model.id)
        api_key = user_setting.api_keys.get(model_id_str)
        if api_key:
            print(f"找到并使用用户为模型 '{final_model.name}' 自定义的 API Key。")

    if not api_key:
        print(f"用户未提供该模型的 Key，回退到系统默认 API Key。")
        api_key = SYSTEM_DEFAULT_API_KEY

    return api_key, final_model


def _call_openai_api(api_key: str, model: AIModel, messages: list, max_tokens: int, temperature: float):
    """
    一个统一调用 OpenAI API 的辅助函数，现在能智能处理 JSON Mode。
    """
    client = OpenAI(api_key=api_key, base_url=model.base_url)

    request_params = {
        "model": model.model_slug,
        "messages": messages,
        "stream": False,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    if model.supports_json_mode:
        request_params["response_format"] = {"type": "json_object"}
        print(f"为模型 '{model.name}' 启用 JSON Mode。")
    else:
        print(f"模型 '{model.name}' 不支持 JSON Mode，将进行常规调用。")

    response = client.chat.completions.create(**request_params)
    content = response.choices[0].message.content

    if not model.supports_json_mode:
        # 清理可能存在的代码块标记
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

    return json.loads(content)


def _call_openai_api_stream(api_key: str, model: AIModel, messages: list, max_tokens: int, temperature: float):
    client = OpenAI(api_key=api_key, base_url=model.base_url)
    stream = client.chat.completions.create(
        model=model.model_slug,
        messages=messages,
        stream=True,
        max_tokens=max_tokens,
        temperature=temperature
    )
    for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        yield content


def generate_first_question(job_position: str, user: User, resume_text: str = None) -> str:
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return "系统AI服务未配置或模型不存在。"

    system_prompt = (
        "你是一位顶尖公司的资深技术面试官，以提问精准、深入、专业著称。"
        "你的任务是开启一场关于特定岗位的面试。"
    )
    if resume_text:
        user_prompt = (
            f"我正在应聘 '{job_position}' 岗位。这是我的简历内容：\n\n"
            f"--- 简历开始 ---\n{resume_text}\n--- 简历结束 ---\n\n"
            "请仔细阅读我的简历，并提出一个有针对性的开场问题。"
            "请严格按照以下 JSON 格式返回，只包含问题文本：\n"
            "{\"question\": \"(你的问题在这里)\"}"
        )
    else:
        user_prompt = (
            f"我正在应聘 '{job_position}' 岗位，但未提供简历。"
            "请为我生成一个通用但热情的开场问题，要求我进行一个简洁的自我介绍。"
            "请严格按照以下 JSON 格式返回，只包含问题文本：\n"
            "{\"question\": \"(你的问题在这里)\"}"
        )

    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        ai_response = _call_openai_api(api_key, model, messages, 300, 0.7)
        return ai_response.get("question", "你好，请做个自我介绍吧。")
    except Exception as e:
        print(f"调用 AI 生成第一问时发生错误: {e}")
        return f"你好，欢迎参加 {job_position} 的面试。很抱歉，我的AI大脑暂时出了一点小问题。不过没关系，我们可以从一个经典问题开始：请先做一个简单的自我介绍吧。"


def analyze_answer(job_position: str, question: str, answer: str, user: User) -> str:
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return "AI服务未配置，无法生成简评。"

    system_prompt = "你是一位专业的面试官，任务是根据候选人的回答给出一个简短、有建设性的评价。"
    user_prompt = (
        f"我正在面试 '{job_position}' 岗位。\n"
        f"面试官提问: {question}\n"
        f"我的回答: {answer}\n\n"
        "请对我的回答给出一个大约50-100字的简评。直接返回评价本身，不要包含多余内容。"
    )
    try:
        client = OpenAI(api_key=api_key, base_url=model.base_url)
        response = client.chat.completions.create(
            model=model.model_slug,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            stream=False,
            max_tokens=200,
            temperature=0.6
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"调用 AI 生成简评时发生错误: {e}")
        return "AI 在分析时遇到了一点小问题。"


def generate_next_question_stream(job_position: str, interview_history: list, user: User):
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        yield "AI服务未配置。"
        return

    history_prompt_part = ""
    for turn in interview_history:
        history_prompt_part += f"面试官: {turn['question']}\n我: {turn['answer']}\n\n"
    system_prompt = "你是一位专业的AI面试官，任务是根据对话历史提出下一个有深度的追问。直接返回问题本身。"
    user_prompt = f"这是关于 '{job_position}' 的面试历史:\n{history_prompt_part}\n现在，请提出你的下一个问题。"

    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        yield from _call_openai_api_stream(api_key, model, messages, 500, 0.8)
    except Exception as e:
        print(f"调用 AI 生成下一问时发生错误: {e}")
        yield "请谈谈你遇到的最大的技术挑战是什么？"


# --- [核心改造 1/3] 新增一个辅助函数，用于简化情绪数据的文本描述 ---
def _summarize_emotion_data(analysis_data: list) -> str:
    if not analysis_data:
        return "无情绪数据。"

    emotion_map: dict[str, str] = {
        'neutral': '平静', 'happy': '开心', 'sad': '悲伤', 'angry': '生气',
        'fearful': '害怕', 'disgusted': '厌恶', 'surprised': '惊讶',
    }

    primary_emotions = []
    for frame in analysis_data:
        emotions = frame.get('emotions', {})
        if emotions:
            # 找到得分最高的情绪
            top_emotion = max(emotions, key=emotions.get)
            primary_emotions.append(emotion_map.get(top_emotion, '未知'))

    if not primary_emotions:
        return "情绪稳定。"

    # 统计主要情绪
    from collections import Counter
    emotion_counts = Counter(primary_emotions)
    summary = ", ".join([f"{emotion}({count}次)" for emotion, count in emotion_counts.most_common(3)])
    return f"主要情绪表现: {summary}。"


# --- [核心改造 2/3] 重写 generate_final_report 函数 ---
def generate_final_report(job_position: str, interview_history: list, user: User, resume_text: str = None) -> dict:
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return {"error": "AI服务未配置，无法生成报告。"}

    # 构造包含情绪分析的面试历史
    history_prompt_part = ""
    for i, turn in enumerate(interview_history):
        emotion_summary = _summarize_emotion_data(turn.get('analysis_data', []))
        history_prompt_part += f"--- 问题 {i + 1} ---\n"
        history_prompt_part += f"面试官提问: {turn['question']}\n"
        history_prompt_part += f"我的回答: {turn['answer']}\n"
        history_prompt_part += f"回答期间情绪总结: {emotion_summary}\n\n"

    # 构造简历部分
    resume_prompt_part = "该候选人未提供简历。"
    if resume_text:
        resume_prompt_part = f"--- 候选人简历 ---\n{resume_text}\n--- 简历结束 ---\n"

    system_prompt = (
        "你是一位顶级的职业规划师和面试分析专家，拥有多年的HR和技术面试官经验。"
        "你的任务是基于候选人的**简历**、**完整的面试记录**以及**每道题回答时的情绪变化**，进行一次全面、深度、富有洞察力的评估。"
        "你的分析必须体现出你综合了所有信息，例如，指出回答中的亮点是否在简历中有所体现，或者情绪波动是否与问题难度相关。"
    )

    user_prompt = (
        f"我刚刚完成了一场关于 '{job_position}' 岗位的模拟面试。请严格遵循以下要求，生成一份综合评估报告。\n\n"
        f"{resume_prompt_part}\n\n"
        f"--- 面试记录 (含情绪总结) ---\n{history_prompt_part}--- 面试记录结束 ---\n\n"
        "请严格按照下面的 JSON 格式返回你的分析报告。所有评分都是0-5分，所有文本内容需客观、专业且有建设性。\n"
        "在 strength_analysis 和 weakness_analysis 中，你的分析必须明确关联到具体的简历内容或面试问答。\n"
        "{\n"
        "  \"overall_score\": \"(一个0到100的整数，代表综合得分)\",\n"
        "  \"ability_scores\": [\n"
        "    {\"name\": \"专业知识\", \"score\": (0-5分)},\n"
        "    {\"name\": \"技术深度\", \"score\": (0-5分)},\n"
        "    {\"name\": \"求职动机\", \"score\": (0-5分)},\n"
        "    {\"name\": \"业务理解\", \"score\": (0-5分)},\n"
        "    {\"name\": \"沟通表达\", \"score\": (0-5分)}\n"
        "  ],\n"
        "  \"overall_comment\": \"(一段100字左右的总体评价，需体现出你结合了简历和面试表现)\",\n"
        "  \"strength_analysis\": \"(分点列出本次面试的亮点，例如：'在回答问题2时，候选人很好地将简历中提到的XX项目经验与实际问题结合，并全程表现自信（情绪主要是开心和平静），这是一个很大的加分项。')\",\n"
        "  \"weakness_analysis\": \"(分点列出本次面试的不足，例如：'对于问题3中关于性能优化的追问，候选人的回答较为宽泛，未能深入到简历中提到的ClickHouse具体应用细节，且情绪数据显示出犹豫（多次出现惊讶），表明在该领域的知识深度有待加强。')\",\n"
        "  \"improvement_suggestions\": [\n"
        "    \"(第一条具体的改进建议)\",\n"
        "    \"(第二条具体的改进建议)\",\n"
        "    \"(第三条具体的改进建议)\"\n"
        "  ],\n"
        "  \"keyword_analysis\": {\n"
        "    \"matched_keywords\": [\"(关键词1)\", \"(关键词2)\", \"(关键词3)\"],\n"
        "    \"missing_keywords\": [\"(关键词1)\", \"(关键词2)\", \"(关键词3)\"],\n"
        "    \"analysis_comment\": \"(一段关于我关键词使用情况的简短分析)\"\n"
        "  },\n"
        "  \"star_analysis\": [\n"
        "    {\n"
        "      \"question_sequence\": 1,\n"
        "      \"is_behavioral_question\": true,\n"
        "      \"conforms_to_star\": false,\n"
        "      \"overall_star_feedback\": \"(对这个回答的STAR法则应用情况给出一个简短的总体评价)\",\n"
        "      \"situation_analysis\": \"(针对'Situation'部分的详尽分析)\",\n"
        "      \"task_analysis\": \"(针对'Task'部分的详尽分析)\",\n"
        "      \"action_analysis\": \"(针对'Action'部分的详尽分析)\",\n"
        "      \"result_analysis\": \"(针对'Result'部分的详尽分析，尤其要强调量化结果的重要性)\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        report_data = _call_openai_api(api_key, model, messages, 4096, 0.5)

        if 'overall_score' in report_data:
            try:
                report_data['overall_score'] = int(report_data['overall_score'])
            except:
                report_data['overall_score'] = 0
        if 'ability_scores' in report_data and isinstance(report_data.get('ability_scores'), list):
            for item in report_data['ability_scores']:
                try:
                    item['score'] = float(item.get('score', 0))
                except:
                    item['score'] = 0
        return report_data
    except Exception as e:
        print(f"调用 AI 生成最终报告时发生错误: {e}")
        return {"error": f"生成报告失败: {e}"}


# --- [核心改造 3/3] 新增一个函数，用于生成 AI 参考答案 ---
def generate_reference_answer_for_question(job_position: str, question: str, user: User,
                                           resume_text: str = None) -> str:
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return "AI 服务未配置，无法生成参考答案。"

    system_prompt = (
        "你是一位经验极其丰富的资深技术专家和面试官，现在需要扮演一位明星候选人。"
        "你的任务是针对一个具体问题，给出一个逻辑清晰、内容详实、并严格遵循 STAR 法则的完美回答。"
    )

    resume_context = "我没有提供简历。"
    if resume_text:
        resume_context = f"请参考我的简历：\n{resume_text}"

    user_prompt = (
        f"我正在面试 '{job_position}' 岗位。\n"
        f"{resume_context}\n\n"
        f"面试官的问题是：\n"
        f"--- 问题开始 ---\n{question}\n--- 问题结束 ---\n\n"
        "请为我生成一份这个问题的“专家级”参考答案。要求：\n"
        "1. 如果是行为面试题，必须严格遵循 STAR 法则，每个部分都要清晰明了。\n"
        "2. 内容要具体、有深度，最好包含量化的结果。\n"
        "3. 直接返回答案文本，不需要任何额外的问候或解释。"
    )
    try:
        client = OpenAI(api_key=api_key, base_url=model.base_url)
        response = client.chat.completions.create(
            model=model.model_slug,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            stream=False,
            max_tokens=1024,
            temperature=0.6
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"调用 AI 生成参考答案时发生错误: {e}")
        return "抱歉，AI 在思考参考答案时遇到了一点小问题。"


def polish_description_by_ai(original_html: str, user: User, job_position: str = None) -> str:
    # ... (此函数保持不变) ...
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return "<p>AI 服务未配置，无法进行润色。</p>"

    system_prompt = (
        "你是一位顶级的简历优化专家和资深 HR，尤其擅长使用 STAR 法则优化工作和项目描述。"
        "规则：必须保持并返回与用户输入完全相同的 HTML 结构（如 <ul>, <li>），只修改文本内容。"
    )
    job_context = f" 这段描述是为应聘 '{job_position}' 岗位准备的。" if job_position else ""
    user_prompt = (
        f"请根据 STAR 法则，优化以下简历描述。{job_context}\n\n"
        f"原始 HTML 内容：\n```html\n{original_html}\n```\n\n"
        f"请严格按照以下 JSON 格式返回优化后的 HTML 内容：\n"
        "{\"polished_html\": \"(这里是你优化后的 HTML 字符串)\"}"
    )

    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        result_json = _call_openai_api(api_key, model, messages, 2048, 0.5)
        return result_json.get("polished_html", original_html)
    except Exception as e:
        print(f"调用 AI 进行文本润色时发生错误: {e}")
        return original_html


def analyze_resume_against_jd(resume_text: str, jd_text: str, user: User) -> dict:
    # ... (此函数保持不变) ...
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return {"error": "AI 服务未配置，无法进行分析。"}

    system_prompt = (
        "你是一位顶级的职业规划导师和资深技术招聘官，拥有15年以上的经验，以分析精准、洞察深刻、要求严格著称。"
        "你的任务是：像对待一份真实投递的简历一样，基于一份岗位描述（JD）和一份候选人简历，进行一次全面、深度、数据驱动的评估。"
    )

    user_prompt = (
        f"请严格遵循以下步骤，对提供的简历和JD进行分析，并以一个完整的JSON对象格式返回结果，不要包含任何额外的解释。\n\n"
        f"--- 岗位描述 (JD) ---\n"
        f"{jd_text}\n"
        f"--- JD 结束 ---\n\n"
        f"--- 候选人简历 ---\n"
        f"{resume_text}\n"
        f"--- 简历结束 ---\n\n"
        f"分析步骤与返回的JSON格式要求如下:\n"
        "{\n"
        "  \"overall_score\": (请给出一个0-100的整数，代表简历与JD的整体匹配度得分),\n"

        "  \"ability_scores\": [\n"
        "    {\"name\": \"岗位技能匹配度\", \"score\": (请根据简历中体现的技能与JD要求的吻合度，给出0-5分，可有1位小数)},\n"
        "    {\"name\": \"项目经验含金量\", \"score\": (请评估简历中的项目经验是否复杂、有深度、与JD相关，给出0-5分)},\n"
        "    {\"name\": \"经验的量化成果\", \"score\": (请评估简历中的描述是否大量使用了具体数字来量化工作成果，给出0-5分)},\n"
        "    {\"name\": \"简历专业性\", \"score\": (请评估简历的整体排版、措辞和专业度，有无错别字等，给出0-5分)}\n"
        "  ],\n"

        "  \"keyword_analysis\": {\n"
        "    \"jd_keywords\": [\"从JD中提取出5-8个最核心的技术/经验关键词\"],\n"
        "    \"matched_keywords\": [\"在简历中明确匹配到的JD关键词\"],\n"
        "    \"missing_keywords\": [\"简历中缺失的、但JD中很重要的关键词\"]\n"
        "  },\n"
        "  \"strengths_analysis\": [\n"
        "    \"(分点列出2-3条简历中最突出的、与JD高度匹配的亮点)\"\n"
        "  ],\n"
        "  \"weaknesses_analysis\": [\n"
        "    \"(分点列出2-3条简历中明显的不足或与JD不匹配之处)\"\n"
        "  ],\n"
        "  \"suggestions\": [\n"
        "    {\n"
        "      \"module\": \"(建议修改的简历模块名，如：'项目经历', '专业技能')\",\n"
        "      \"suggestion\": \"(提供一条非常具体、可执行的修改建议，例如：'在AI模拟面试平台的项目描述中，将“提升了页面加载速度”具体化为“通过代码分割和图片懒加载，将首页的LCP时间从3.2s优化至1.8s”。')\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        analysis_report = _call_openai_api(api_key, model, messages, 3072, 0.6)

        if 'overall_score' in analysis_report and not isinstance(analysis_report['overall_score'], int):
            try:
                analysis_report['overall_score'] = int(analysis_report['overall_score'])
            except (ValueError, TypeError):
                analysis_report['overall_score'] = 0

        if 'ability_scores' in analysis_report and isinstance(analysis_report.get('ability_scores'), list):
            for item in analysis_report['ability_scores']:
                if 'score' in item and not isinstance(item['score'], (int, float)):
                    try:
                        item['score'] = float(item['score'])
                    except (ValueError, TypeError):
                        item['score'] = 0

        return analysis_report

    except Exception as e:
        print(f"调用 AI 进行简历分析时发生错误: {e}")
        return {"error": f"分析失败，AI服务暂时不可用: {e}"}


def generate_resume_by_ai(name: str, position: str, experience_years: str, keywords: str, user: User) -> dict:
    # ... (此函数保持不变) ...
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return {"error": "AI 服务未配置"}

    system_prompt = (
        "你是一位世界顶级的简历撰写专家，任务是根据用户的核心信息，生成一份专业、完整的简历。"
        "你必须严格按照我指定的 JSON 格式返回，包含 'sidebar' 和 'main' 两个区域的模块数组。"
    )
    user_prompt = (
        f"请为我生成一份简历。我的核心信息如下：\n"
        f"- 姓名: {name}\n"
        f"- 期望岗位: {position}\n"
        f"- 工作年限: {experience_years}\n"
        f"- 其他关键词或个人优势: {keywords}\n\n"
        f"请为我生成“基本信息”、“教育背景”、“工作经历”、“项目经历”、“专业技能”和“自我评价”这几个核心模块。"
        f"内容需要你根据期望岗位进行专业的、合理的虚构和扩展，使其看起来非常真实和有竞争力。"
        f"返回的 JSON 结构必须如下（不要包含任何额外解释）：\n"
        "{\n"
        "  \"sidebar\": [\n"
        "    {\n"
        "      \"id\": \"(生成一个uuid)\",\n"
        "      \"componentName\": \"BaseInfoModule\",\n"
        "      \"moduleType\": \"BaseInfo\",\n"
        "      \"title\": \"基本信息\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"name\": \"(用户的姓名)\",\n"
        "        \"photo\": \"\",\n"
        "        \"items\": [\n"
        "          {\"id\": \"(uuid)\", \"label\": \"电话\", \"value\": \"138-xxxx-xxxx\"},\n"
        "          {\"id\": \"(uuid)\", \"label\": \"邮箱\", \"value\": \"xxxx@email.com\"}\n"
        "        ]\n"
        "      }\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"(uuid)\",\n"
        "      \"componentName\": \"SkillsModule\",\n"
        "      \"moduleType\": \"Skills\",\n"
        "      \"title\": \"专业技能\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"title\": \"专业技能\",\n"
        "        \"skills\": [\n"
        "          {\"id\": \"(uuid)\", \"name\": \"(根据岗位生成的核心技能1)\", \"proficiency\": \"精通\"},\n"
        "          {\"id\": \"(uuid)\", \"name\": \"(技能2)\", \"proficiency\": \"熟练\"}\n"
        "        ]\n"
        "      }\n"
        "    }\n"
        "  ],\n"
        "  \"main\": [\n"
        "    {\n"
        "      \"id\": \"(uuid)\",\n"
        "      \"componentName\": \"SummaryModule\",\n"
        "      \"moduleType\": \"Summary\",\n"
        "      \"title\": \"自我评价\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"title\": \"自我评价\",\n"
        "        \"summary\": \"(生成一段2-3句话分点的、高度概括的自我评价)\"\n"
        "      }\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"(uuid)\",\n"
        "      \"componentName\": \"WorkExpModule\",\n"
        "      \"moduleType\": \"WorkExp\",\n"
        "      \"title\": \"工作经历\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"title\": \"工作经历\",\n"
        "        \"experiences\": [\n"
        "          {\n"
        "            \"id\": \"(uuid)\",\n"
        "            \"company\": \"(虚构一个知名的相关公司)\",\n"
        "            \"position\": \"(相关职位)\",\n"
        "            \"dateRange\": [\"(合理的开始年份)\", \"(合理的结束年份)\"],\n"
        "            \"description\": \"(使用STAR法则分点生成一段非常有吸引力的工作描述，包含量化结果)\"\n"
        "          }\n"
        "        ]\n"
        "      }\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"(uuid)\",\n"
        "      \"componentName\": \"ProjectModule\",\n"
        "      \"moduleType\": \"Project\",\n"
        "      \"title\": \"项目经历\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"title\": \"项目经历\",\n"
        "        \"projects\": [\n"
        "          {\n"
        "            \"id\": \"(uuid)\",\n"
        "            \"name\": \"(虚构一个亮眼的相关项目)\",\n"
        "            \"role\": \"(核心角色)\",\n"
        "            \"dateRange\": [\"(合理的开始年份)\", \"(合理的结束年份)\"],\n"
        "            \"description\": \"(使用STAR法则分点生成一段非常有吸引力的项目描述)\",\n"
        "            \"techStack\": \"(项目使用的技术栈)\"\n"
        "          }\n"
        "        ]\n"
        "      }\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"(uuid)\",\n"
        "      \"componentName\": \"EducationModule\",\n"
        "      \"moduleType\": \"Education\",\n"
        "      \"title\": \"教育背景\",\n"
        "      \"props\": {\n"
        "        \"show\": true,\n"
        "        \"title\": \"教育背景\",\n"
        "        \"educations\": [\n"
        "          {\n"
        "            \"id\": \"(uuid)\",\n"
        "            \"school\": \"(虚构一所不错的大学)\",\n"
        "            \"major\": \"(相关专业)\",\n"
        "            \"degree\": \"(本科/硕士)\",\n"
        "            \"dateRange\": [\"(合理的开始年份)\", \"(合理的结束年份)\"],\n"
        "            \"description\": \"\"\n"
        "          }\n"
        "        ]\n"
        "      }\n"
        "    }\n"
        "  ]\n"
        "}"
    )
    try:
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        resume_json = _call_openai_api(api_key, model, messages, 4096, 0.8)
        return resume_json
    except Exception as e:
        print(f"调用 AI 生成简历时发生错误: {e}")
        return {"error": f"AI 生成失败: {e}"}


def _get_memory_cache_key(resume: dict) -> str:
    """基于简历内容生成记忆缓存键（取 content 前 200 字 hash）"""
    content = resume.get('content', '') if resume else ''
    # 提取姓名 + 前几个 ## 标题作为稳定键
    import re
    name_m = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    sections_m = re.findall(r'^##\s+(.+)$', content, re.MULTILINE)
    name = name_m.group(1).strip() if name_m else 'unknown'
    sections_key = '|'.join(sections_m[:4]) if sections_m else 'empty'
    return f"{name}::{sections_key}"


def _get_memory_context(resume: dict) -> str:
    """从缓存中读取上次分类结果作为记忆上下文"""
    if not resume:
        return "（无记忆）"
    key = _get_memory_cache_key(resume)
    cached = _resume_memory_cache.get(key)
    if not cached:
        return "（首次对话，无记忆）"
    return (
        f"上次 mode: {cached.get('mode', 'N/A')}\n"
        f"上次 section: {cached.get('section_hint', 'N/A')}\n"
        f"上次 intent: {cached.get('intent', 'N/A')}"
    )


def _update_memory_cache(resume: dict, classification: dict):
    """更新简历记忆缓存"""
    if not resume or not classification:
        return
    key = _get_memory_cache_key(resume)
    _resume_memory_cache[key] = {
        "mode": classification.get("mode"),
        "section_hint": classification.get("section_hint"),
        "intent": classification.get("intent"),
    }


def generate_resume_chat_response(
    user_message: str,
    current_resume: dict,
    chat_history: list,
    last_edited_field: str | None,
    user: User,
    optimized_prompt: str | None = None
) -> dict:
    """
    AI 对话式简历生成
    
    Args:
        user_message: 用户输入的消息
        current_resume: 当前简历数据
        chat_history: 聊天历史（最近10轮）
        last_edited_field: 最后编辑的字段路径
        user: 当前用户
        
    Returns:
        {
            "instructions": [
                {
                    "action": "update",
                    "path": "basicInfo.name",
                    "value": "张三",
                    "reason": "更新姓名"
                }
            ],
            "message": "给用户的反馈消息"
        }
    """
    api_key, model = _get_user_ai_config(user)
    if not api_key or not model:
        return {
            "error": "AI 配置未找到",
            "instructions": [],
            "message": "抱歉，AI 服务配置有误，请联系管理员。"
        }

    # 使用 Claude Code 模式的分类器 system prompt
    system_prompt = RESUME_CHAT_SYSTEM_PROMPT

    # 优先使用前端传来的完整 prompt；否则后端自建
    if optimized_prompt:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": optimized_prompt}
        ]
    else:
        resume_summary = _build_resume_summary(current_resume)
        compressed_history = _compress_chat_history(chat_history)
        memory_context = _get_memory_context(current_resume)
        resume_content = current_resume.get('content', '') if current_resume else ''
        user_prompt = (
            f"## 当前简历完整内容\n{resume_content or '（简历为空）'}\n\n"
            f"## 简历摘要\n{resume_summary}\n\n"
            f"## 记忆上下文\n{memory_context}\n\n"
            f"## 最近对话\n{compressed_history}\n\n"
            f"## 用户请求\n{user_message}\n\n"
            "请按分类流程：Step 1 输出 classification，Step 2 根据 mode 生成 instructions 和 message。"
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

    try:
        response_data = _call_openai_api(api_key, model, messages, 4096, 0.7)

        if isinstance(response_data, str):
            try:
                response_data = json.loads(response_data)
            except json.JSONDecodeError:
                return {"instructions": [], "message": response_data}

        if not isinstance(response_data, dict):
            response_data = {"instructions": [], "message": str(response_data)}
        if "instructions" not in response_data:
            response_data["instructions"] = []
        if "message" not in response_data:
            response_data["message"] = "处理完成"

        # 缓存分类结果到记忆
        classification = response_data.get("classification")
        if classification:
            _update_memory_cache(current_resume, classification)

        return response_data

    except Exception as e:
        print(f"AI 对话生成失败: {e}")
        return {
            "error": f"AI 生成失败: {e}",
            "instructions": [],
            "message": "抱歉，AI 服务暂时不可用，请稍后重试。"
        }


def _build_resume_summary(resume: dict) -> str:
    """构建简历摘要（极简版 schema）"""
    if not resume:
        return "姓名：未填写\n岗位：未指定\n统计：工作0段、项目0个、教育0段"

    content = resume.get('content', '') or ''

    import re
    name_m = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    name = name_m.group(1).strip() if name_m else '未填写'
    pos_m = re.search(r'(?:岗位|职位)[：:]\s*(.+)', content)
    position = pos_m.group(1).strip() if pos_m else '未指定'

    # 统计各区块数量（通过 ## 标题匹配）
    def count_sections(prefix):
        import re
        return len(re.findall(rf'^##\s+.+{prefix}', content, re.MULTILINE))

    work_count = count_sections('工作')
    project_count = count_sections('项目')
    education_count = count_sections('教育')

    # 提取关键词：从 content 前500字中取中文词
    import re
    words = re.findall(r'[\u4e00-\u9fa5]{2,}', content[:500])
    common = {'的', '了', '在', '是', '和', '有', '为', '等', '使用', '负责', '开发', '完成', '实现', '提升'}
    keywords = [w for w in words if w not in common][:8]
    keyword_str = f"\n关键词：{', '.join(keywords)}" if keywords else ""

    return (
        f"姓名：{name}\n"
        f"岗位：{position}\n"
        f"统计：工作{work_count}段、项目{project_count}个、教育{education_count}段"
        f"{keyword_str}"
    )


def _compress_chat_history(history: list) -> str:
    """压缩聊天历史"""
    if not history:
        return "（无对话历史）"
    
    # 只保留最近5轮对话
    recent = history[-10:]
    
    compressed = []
    for msg in recent:
        role = "用户" if msg.get('role') == 'user' else "AI"
        content = msg.get('content', '')
        # 截断过长的消息
        if len(content) > 200:
            content = content[:200] + "..."
        compressed.append(f"{role}：{content}")
    
    return "\n".join(compressed)


