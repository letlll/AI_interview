"""
TC-INTV-04: 面试结束
测试内容: 答完全部题目，验证面试状态更新和报告生成
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession, InterviewQuestion
from tests.mock_ai_service import MockAIService
from django.utils import timezone

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_04_FinishInterviewTest(TestCase):
    """面试结束测试——验证报告生成。"""

    START_URL = '/api/v1/interviews/start/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv04@example.com'
        cls.password = 'Intv04Pass!'
        cls.user = User.objects.create_user(
            username='intv04', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
        self.mock_ai.set_response('interview_feedback', score=80, feedback='不错')
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

    def _create_session_with_answers(self, question_count=1):
        start = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': question_count,
        }, format='json')
        session_id = start.data['id']
        q_id = start.data['questions'][0]['id']

        # Submit answer to reach question limit
        self.client.post(f'/api/v1/interviews/{session_id}/submit-answer-stream/', {
            'question_id': q_id, 'answer_text': '我的回答',
        }, format='json')
        return session_id, q_id

    def test_01_finish_updates_status_to_finished(self):
        """finish 后 status 变为 finished。"""
        session_id, _ = self._create_session_with_answers(1)
        resp = self.client.post(f'/api/v1/interviews/{session_id}/finish/')
        self.assertEqual(resp.status_code, 200)

        session = InterviewSession.objects.get(id=session_id)
        self.assertEqual(session.status, InterviewSession.Status.FINISHED)

    def test_02_finish_sets_finished_at(self):
        """finish 后 finished_at 被设置。"""
        session_id, _ = self._create_session_with_answers(1)
        self.client.post(f'/api/v1/interviews/{session_id}/finish/')
        session = InterviewSession.objects.get(id=session_id)
        self.assertIsNotNone(session.finished_at)

    def test_03_finish_generates_report_json(self):
        """finish 后 report JSON 字段非空。"""
        session_id, _ = self._create_session_with_answers(1)
        resp = self.client.post(f'/api/v1/interviews/{session_id}/finish/')
        self.assertEqual(resp.status_code, 200)

        session = InterviewSession.objects.get(id=session_id)
        self.assertIsNotNone(session.report)

    def test_04_cannot_finish_without_answers(self):
        """无答题记录时 finish 返回 400。"""
        start = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        session_id = start.data['id']
        resp = self.client.post(f'/api/v1/interviews/{session_id}/finish/')
        self.assertEqual(resp.status_code, 400)
