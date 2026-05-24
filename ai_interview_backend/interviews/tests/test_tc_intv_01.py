"""
TC-INTV-01: 创建面试
测试内容: 选择岗位、难度、题目数，验证首题生成成功
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_01_CreateInterviewTest(TestCase):
    """创建面试——验证首题生成。"""

    START_URL = '/api/v1/interviews/start/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv01@example.com'
        cls.password = 'Intv01Pass!'
        cls.user = User.objects.create_user(
            username='intv01', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='请做自我介绍')
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

    def test_01_start_creates_session_and_first_question(self):
        """开始面试创建 session 并生成首题。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
            'question_count': 3,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'running')
        self.assertEqual(resp.data['question_count'], 3)
        self.assertEqual(len(resp.data['questions']), 1)
        self.assertIn('请做自我介绍', resp.data['questions'][0]['question_text'])

    def test_02_started_at_is_set(self):
        """创建后 started_at 时间戳非空。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        self.assertIsNotNone(resp.data['started_at'])

    def test_03_session_status_is_running(self):
        """创建后 session 状态为 running。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        self.assertEqual(resp.data['status'], 'running')

    def test_04_question_count_defaults_to_5(self):
        """不传 question_count 时默认 5。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        self.assertEqual(resp.data['question_count'], 5)

    def test_05_missing_job_position_returns_400(self):
        """缺少 job_position 返回 400。"""
        resp = self.client.post(self.START_URL, {}, format='json')
        self.assertEqual(resp.status_code, 400)
