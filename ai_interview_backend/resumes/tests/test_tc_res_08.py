"""
TC-RES-08: AI 对话编辑简历
测试内容: 通过 AI 对话式编辑简历，验证增量更新指令和回复
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_08_AIChatResumeTest(TestCase):
    """AI 对话编辑简历测试。"""

    CHAT_URL = '/api/v1/generate-resume-chat/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res08@example.com'
        cls.password = 'Res08Pass!'
        cls.user = User.objects.create_user(
            username='res08', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('resume_chat',
                                   reply='好的，已为您添加 Docker 技能。',
                                   delta={'skills': [{'name': 'Docker', 'level': '了解'}]})
        self.mock_ai.enable()
        self.client = APIClient()
        self._auth()

    def tearDown(self):
        self.mock_ai.disable()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 对话 ──

    def test_01_chat_returns_200(self):
        """AI 对话成功返回 200。"""
        resp = self.client.post(self.CHAT_URL, {
            'user_message': '请帮我在技能里加上 Docker',
            'current_resume': {'content': '# 简历'},
            'chat_history': [],
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_02_chat_returns_reply(self):
        """AI 对话返回回复消息。"""
        resp = self.client.post(self.CHAT_URL, {
            'user_message': '添加 Docker 技能',
            'current_resume': {},
            'chat_history': [],
        }, format='json')
        self.assertIn('reply', resp.data)
        self.assertIn('Docker', resp.data['reply'])

    def test_03_chat_returns_delta(self):
        """AI 对话返回增量更新指令。"""
        resp = self.client.post(self.CHAT_URL, {
            'user_message': '添加技能',
            'current_resume': {},
            'chat_history': [],
        }, format='json')
        self.assertIn('delta', resp.data)

    def test_04_chat_with_history(self):
        """对话历史可传递给 AI。"""
        resp = self.client.post(self.CHAT_URL, {
            'user_message': '继续修改',
            'current_resume': {'content': '# 旧简历'},
            'chat_history': [
                {'role': 'user', 'content': '帮我优化简历'},
                {'role': 'assistant', 'content': '好的，请告诉我您的需求'},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_05_empty_message_returns_400(self):
        """空的 user_message 返回 400。"""
        resp = self.client.post(self.CHAT_URL, {
            'user_message': '',
            'current_resume': {},
            'chat_history': [],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_06_chat_unauthenticated_returns_401(self):
        """未认证请求返回 401。"""
        anon = APIClient()
        resp = anon.post(self.CHAT_URL, {
            'user_message': 'hello',
        }, format='json')
        self.assertEqual(resp.status_code, 401)
