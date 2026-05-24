"""
TC-INTV-05: 表情分析数据
测试内容: 提交答案时携带 analysis_data（面部表情时间序列），验证存储与读取
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession, InterviewQuestion
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_05_FaceAnalysisTest(TestCase):
    """表情分析数据存储测试。"""

    START_URL = '/api/v1/interviews/start/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv05@example.com'
        cls.password = 'Intv05Pass!'
        cls.user = User.objects.create_user(
            username='intv05', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
        self.mock_ai.set_response('interview_feedback', score=75, feedback='还行')
        self.mock_ai.enable()
        self.client = APIClient()
        self._auth()
        cache.clear()

    def tearDown(self):
        self.mock_ai.disable()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def _start_and_submit(self, analysis_data=None):
        """创建 session 并提交答案，返回 question 对象。"""
        start = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': 1,
        }, format='json')
        session_id = start.data['id']
        q_id = start.data['questions'][0]['id']

        body = {'question_id': q_id, 'answer_text': '我的回答'}
        if analysis_data is not None:
            body['analysis_data'] = analysis_data

        self.client.post(
            f'/api/v1/interviews/{session_id}/submit-answer-stream/',
            body, format='json',
        )
        return InterviewQuestion.objects.get(id=q_id)

    # ── 正面测试 ──

    def test_01_analysis_data_saved(self):
        """提交 analysis_data 后被正确存储。"""
        frames = [
            {'timestamp': 0.0, 'emotions': {'happy': 0.8, 'neutral': 0.2}},
            {'timestamp': 1.0, 'emotions': {'happy': 0.6, 'neutral': 0.4}},
            {'timestamp': 2.0, 'emotions': {'neutral': 0.7, 'surprised': 0.3}},
        ]
        q = self._start_and_submit(analysis_data=frames)
        self.assertIsNotNone(q.analysis_data)
        self.assertEqual(len(q.analysis_data), 3)

    def test_02_analysis_data_structure_preserved(self):
        """analysis_data 中的 timestamp 和 emotions 结构被保留。"""
        frames = [
            {'timestamp': 1.5, 'emotions': {'angry': 0.1, 'sad': 0.2}},
        ]
        q = self._start_and_submit(analysis_data=frames)
        self.assertEqual(q.analysis_data[0]['timestamp'], 1.5)
        self.assertIn('emotions', q.analysis_data[0])

    def test_03_no_analysis_data_stays_null(self):
        """不提交 analysis_data 时字段保持 None。"""
        q = self._start_and_submit(analysis_data=None)
        self.assertIsNone(q.analysis_data)

    def test_04_empty_list_treated_as_none(self):
        """空列表被视为无数据（if analysis_data 对空列表为 False）。"""
        q = self._start_and_submit(analysis_data=[])
        self.assertIsNone(q.analysis_data)

    # ── 边界 ──

    def test_05_answer_text_still_saved_with_analysis(self):
        """携带 analysis_data 提交时 answer_text 正常保存。"""
        q = self._start_and_submit(analysis_data=[
            {'timestamp': 0.0, 'emotions': {'neutral': 1.0}},
        ])
        self.assertEqual(q.answer_text, '我的回答')
        self.assertIsNotNone(q.answered_at)
