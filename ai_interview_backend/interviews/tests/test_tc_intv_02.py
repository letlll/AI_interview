"""
TC-INTV-02: 未完成面试检测
测试内容: 存在未完成面试时进入 Dashboard 弹出恢复提示
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_02_UnfinishedCheckTest(TestCase):
    """未完成面试检测测试。"""

    START_URL = '/api/v1/interviews/start/'
    CHECK_URL = '/api/v1/interviews/check-unfinished/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv02@example.com'
        cls.password = 'Intv02Pass!'
        cls.user = User.objects.create_user(
            username='intv02', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='测试题目')
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

    def test_01_no_unfinished_returns_false(self):
        """无未完成面试时返回 has_unfinished=False。"""
        resp = self.client.get(self.CHECK_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['has_unfinished'])

    def test_02_has_unfinished_returns_true(self):
        """存在未完成面试时返回 has_unfinished=True。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        resp = self.client.get(self.CHECK_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['has_unfinished'])
        self.assertIn('session_id', resp.data)
        self.assertEqual(resp.data['job_position'], 'Python 开发')

    def test_03_finished_session_not_detected(self):
        """已完成的面试不会被检测为未完成。"""
        start_resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': 1,
        }, format='json')
        session_id = start_resp.data['id']
        session = InterviewSession.objects.get(id=session_id)
        session.status = InterviewSession.Status.FINISHED
        session.save()

        resp = self.client.get(self.CHECK_URL)
        self.assertFalse(resp.data['has_unfinished'])

    def test_04_check_unfinished_returns_job_position(self):
        """检测响应包含岗位名称。"""
        self.client.post(self.START_URL, {
            'job_position': '前端工程师',
        }, format='json')
        resp = self.client.get(self.CHECK_URL)
        self.assertEqual(resp.data['job_position'], '前端工程师')
