"""
TC-INTV-09: 放弃面试
测试内容: 主动放弃未完成面试，验证状态更新
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_09_AbandonInterviewTest(TestCase):
    """放弃面试测试。"""

    START_URL = '/api/v1/interviews/start/'
    ABANDON_URL = '/api/v1/interviews/abandon-unfinished/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv09@example.com'
        cls.password = 'Intv09Pass!'
        cls.user = User.objects.create_user(
            username='intv09', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
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

    def test_01_abandon_sets_status_to_canceled(self):
        """放弃面试后 session 状态变为 canceled。"""
        start = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        session_id = start.data['id']

        resp = self.client.post(self.ABANDON_URL)
        self.assertEqual(resp.status_code, 200)

        session = InterviewSession.objects.get(id=session_id)
        self.assertEqual(session.status, InterviewSession.Status.CANCELED)

    def test_02_abandon_removes_from_cache(self):
        """放弃后缓存被清除。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        self.client.post(self.ABANDON_URL)

        resp = self.client.get('/api/v1/interviews/check-unfinished/')
        self.assertFalse(resp.data['has_unfinished'])

    def test_03_abandon_without_active_returns_404(self):
        """无活跃面试时放弃返回 404。"""
        resp = self.client.post(self.ABANDON_URL)
        self.assertEqual(resp.status_code, 404)
