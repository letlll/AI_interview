"""
全局 Mock AI 服务。

统一封装 DeepSeek API mock 行为，支持 6 类场景的预设返回值。
每个调用场景对应一个 `_default_responses` 键，测试代码使用 `set_response()` 覆盖。

用法:
    from tests.mock_ai_service import MockAIService

    mock = MockAIService()
    mock.set_response('interview_question', question="What is Django?")
    mock.enable()
    # ... 运行测试 ...
    mock.disable()
"""
import json
from unittest.mock import patch, MagicMock


class MockAIService:
    """DeepSeek API 全局 Mock 工具类。"""

    # ── 6 类场景的默认模拟返回值 ──
    _default_responses = {
        'interview_question': {
            'question': '请做一个简单的自我介绍，包括您的主要技术栈和项目经验。',
            'type': 'self_introduction',
            'expected_points': ['技术栈概述', '核心项目经验', '自我定位'],
            'difficulty': 'medium',
            'reference_context': '考察候选人的基本表达能力和技术背景',
        },
        'interview_followup': {
            'question': '针对您刚才提到的项目，请详细描述您在项目中遇到的最大技术挑战以及如何解决的。',
            'type': 'deep_dive',
            'expected_points': ['问题描述清晰度', '解决方案合理性', '个人贡献度'],
            'difficulty': 'medium',
            'reference_context': '基于上一题回答的追问',
        },
        'interview_feedback': {
            'score': 75,
            'feedback': '回答结构清晰，技术要点覆盖全面，但缺少具体数据支撑。',
            'strengths': ['表达流畅', '技术基础扎实'],
            'weaknesses': ['缺少量化结果', 'STAR 结构不够完整'],
            'star_evaluation': {
                'situation': 6,
                'task': 7,
                'action': 8,
                'result': 5,
            },
        },
        'resume_generate': {
            'resume_json': {
                'full_name': '张三',
                'job_title': 'Python 开发工程师',
                'phone': '13800000000',
                'email': 'zhangsan@example.com',
                'city': '北京',
                'summary': '3 年 Python 后端开发经验，熟悉 Django/Flask 框架。',
                'education': [
                    {
                        'school': '某某大学',
                        'degree': '本科',
                        'major': '软件工程',
                        'start_date': '2018-09',
                        'end_date': '2022-06',
                    }
                ],
                'work_experience': [
                    {
                        'company': '某科技有限公司',
                        'position': 'Python 开发工程师',
                        'start_date': '2022-07',
                        'end_date': '至今',
                        'description': '负责后端 API 开发与数据库优化',
                    }
                ],
                'skills': [
                    {'name': 'Python', 'level': '精通'},
                    {'name': 'Django', 'level': '熟练'},
                    {'name': 'MySQL', 'level': '熟练'},
                ],
            },
        },
        'resume_chat': {
            'delta': {
                'skills': [
                    {'name': 'Docker', 'level': '了解'},
                ],
            },
            'reply': '已在您的简历技能部分添加了 Docker。还需要补充其他技能吗？',
        },
        'jd_match': {
            'overall_score': 72,
            'match_score': 72,
            'analysis': '您的简历与 JD 匹配度为 72%。主要差距在于"云计算"和"微服务"相关经验不足。',
            'suggestions': [
                '建议补充微服务架构相关项目经验',
                '可将 Docker/K8s 经验突出展示',
                '数据量化您的项目成果，例如"提升性能 30%"',
            ],
            'matched_keywords': ['Python', 'Django', 'MySQL'],
            'missing_keywords': ['AWS', 'Kubernetes', 'gRPC'],
        },
        'reference_answer': {
            'answer': '在之前的项目中，我们面临的主要挑战是数据库查询性能问题。通过引入 Redis 缓存和优化 SQL 查询，我们将首页加载时间从 3 秒降低到了 200 毫秒。此外，我们还实施了读写分离架构...',
            'star_breakdown': {
                'situation': '系统首页加载时间达到 3 秒，严重影响用户体验',
                'task': '在两周内将加载时间优化到 500 毫秒以内',
                'action': '引入 Redis 缓存层、优化 SQL 索引、实施数据库读写分离',
                'result': '加载时间降至 200 毫秒，接口 QPS 提升 5 倍',
            },
        },
    }

    def __init__(self):
        self._patchers: list = []
        self._overrides: dict = {}

    # ── 公共 API ──

    def set_response(self, scene: str, **overrides):
        """为指定场景设置自定义返回值。

        Args:
            scene: 场景名，必须是 _default_responses 中的键之一
            **overrides: 覆盖默认返回值中的字段（深度合并顶层键）
        """
        if scene not in self._default_responses:
            raise ValueError(
                f"未知场景 '{scene}'，可用场景: {list(self._default_responses.keys())}"
            )
        self._overrides[scene] = overrides

    def enable(self):
        """激活全局 AI Mock——拦截所有 OpenAI SDK chat.completions.create 调用。"""
        self.disable()  # 先清理防止重复 patch

        # 确保测试数据库中存在默认 AIModel，_get_user_ai_config 依赖它
        self._ensure_ai_model()

        patcher = patch(
            'openai.resources.chat.completions.Completions.create',
            side_effect=self._mock_create,
        )
        patcher.start()
        self._patchers.append(patcher)

    def _ensure_ai_model(self):
        """确保测试数据库中存在默认的 AIModel 记录。"""
        from system.models import AIModel
        AIModel.objects.get_or_create(
            model_slug='deepseek-chat',
            defaults={
                'name': 'DeepSeek Chat',
                'base_url': 'https://api.deepseek.com/v1',
                'is_active': True,
                'supports_json_mode': True,
                'description': 'Mock model for testing',
            },
        )

    def disable(self):
        """停用所有 mock，恢复真实 API 调用。"""
        for p in self._patchers:
            p.stop()
        self._patchers.clear()

    def reset(self):
        """重置所有场景覆盖为默认值并停用 mock。"""
        self.disable()
        self._overrides.clear()

    # ── 内部实现 ──

    def _build_response(self, scene: str, content_dict: dict) -> MagicMock:
        """构造一个完整的 OpenAI ChatCompletion 对象 mock。"""
        message_mock = MagicMock()
        message_mock.content = json.dumps(content_dict, ensure_ascii=False)
        message_mock.role = 'assistant'

        choice_mock = MagicMock()
        choice_mock.message = message_mock
        choice_mock.index = 0
        choice_mock.finish_reason = 'stop'

        response_mock = MagicMock()
        response_mock.choices = [choice_mock]
        response_mock.id = 'mock-chatcmpl-001'
        response_mock.model = 'deepseek-chat'
        response_mock.object = 'chat.completion'
        return response_mock

    def _detect_scene(self, messages: list) -> str:
        """根据 prompt 内容自动检测场景类型。

        检测规则（按优先级）：
        1. system prompt 含 '面试' + '题目'/'出题'/'追问' → interview_question
        2. system prompt 含 '反馈'/'评估'/'评分' → interview_feedback
        3. system prompt 含 '简历' + '对话'/'编辑'/'修改' → resume_chat
        4. system prompt 含 '简历' + '生成' → resume_generate
        5. system prompt 含 'JD'/'岗位描述'/'匹配' → jd_match
        6. system prompt 含 '参考'/'答案'/'STAR' → reference_answer
        """
        full_text = ' '.join(
            m.get('content', '') for m in messages
            if isinstance(m, dict) and m.get('content')
        )

        if any(kw in full_text for kw in ['面试题目', '出题', '追问', '下一道']):
            if '追问' in full_text:
                return 'interview_followup'
            return 'interview_question'

        # 参考回答在简历检测之前（"我(没/未)提供简历"会误触发 resume）
        if any(kw in full_text for kw in ['参考答案', 'STAR', '参考回答', 'reference']):
            return 'reference_answer'

        # 简历检测在反馈之前（RESUME_CHAT_SYSTEM_PROMPT 含"反馈"等词）
        if any(kw in full_text for kw in ['简历', 'resume']):
            negative_resume = any(
                kw in full_text for kw in
                ['未提供简历', '未上传简历', '没有简历', '无简历',
                 '没有提供简历', '未提供', 'without resume', 'no resume']
            )
            if not negative_resume:
                # jd_match 先于 resume_chat——"匹配"/"诊断"太泛化，改用 JD/岗位描述
                if any(kw in full_text for kw in ['JD', '岗位描述', '职位描述']):
                    return 'jd_match'
                if any(kw in full_text for kw in ['对话', '编辑', '修改', '增量']):
                    return 'resume_chat'
                if any(kw in full_text for kw in ['生成', 'generate', '创建']):
                    return 'resume_generate'

        if any(kw in full_text for kw in ['反馈', '评分', '评估回答']):
            return 'interview_feedback'

        # 默认回退：返回 interview_question
        return 'interview_question'

    def _get_streaming_text(self, scene: str, content: dict) -> str:
        """获取流式响应的纯文本内容。"""
        if scene in ('interview_question', 'interview_followup'):
            return content.get('question', '请谈谈您的技术经验。')
        if scene == 'interview_feedback':
            return content.get('feedback', '回答不错。')
        if scene == 'reference_answer':
            return content.get('answer', '这是一个参考答案。')
        if scene == 'resume_chat':
            return content.get('reply', '好的，已更新。')
        return json.dumps(content, ensure_ascii=False)

    def _build_streaming_chunks(self, scene: str, content: dict) -> list:
        """构造流式响应的 chunk mock 列表。"""
        text = self._get_streaming_text(scene, content)
        chunks = []
        chunk_size = max(1, len(text) // 4) if len(text) > 4 else 1
        for i in range(0, len(text), chunk_size):
            chunk_text = text[i:i + chunk_size]
            delta_mock = MagicMock()
            delta_mock.content = chunk_text

            choice_mock = MagicMock()
            choice_mock.delta = delta_mock
            choice_mock.index = 0
            choice_mock.finish_reason = 'stop' if i + chunk_size >= len(text) else None

            chunk_mock = MagicMock()
            chunk_mock.choices = [choice_mock]
            chunks.append(chunk_mock)
        return chunks if chunks else [self._build_empty_chunk()]

    def _build_empty_chunk(self) -> MagicMock:
        """构造一个空内容的流式 chunk（兜底）。"""
        delta_mock = MagicMock()
        delta_mock.content = ''
        choice_mock = MagicMock()
        choice_mock.delta = delta_mock
        choice_mock.index = 0
        choice_mock.finish_reason = 'stop'
        chunk_mock = MagicMock()
        chunk_mock.choices = [choice_mock]
        return chunk_mock

    def _mock_create(self, *args, **kwargs):
        """Mock 的 chat.completions.create 方法。

        自动检测场景并返回对应的模拟数据。
        如果 stream=True，返回流式 chunk 列表。
        """
        messages = kwargs.get('messages', [])
        scene = self._detect_scene(messages)

        default = self._default_responses.get(scene, {})
        overrides = self._overrides.get(scene, {})

        # 合并：overrides 的顶层键覆盖 default
        content = {**default, **overrides}

        if kwargs.get('stream'):
            return self._build_streaming_chunks(scene, content)
        return self._build_response(scene, content)
