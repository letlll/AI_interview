"""
TC-AUTH-02: 邮箱登录
测试内容: 输入已注册邮箱和正确密码，验证登录成功返回 Token
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_AUTH_02_LoginSuccessTest(TestCase):
    """邮箱登录成功测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    PROFILE_URL = '/api/v1/auth/profile/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'logintest@example.com'
        cls.password = 'LoginPass123!'
        cls.user = User.objects.create_user(
            username='logintest',
            email=cls.email,
            password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()

    def test_01_login_returns_access_and_refresh(self):
        """正确凭据登录返回 access + refresh Token。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_02_access_token_is_three_part_jwt(self):
        """Access Token 为三段式 JWT。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.assertEqual(len(resp.data['access'].split('.')), 3)

    def test_03_refresh_token_is_three_part_jwt(self):
        """Refresh Token 也是三段式 JWT。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.assertEqual(len(resp.data['refresh'].split('.')), 3)

    def test_04_login_updates_last_login(self):
        """登录后 last_login 字段更新。"""
        original = self.user.last_login
        self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_05_token_can_access_protected_api(self):
        """登录获取的 Token 可访问受保护接口。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')
        profile = self.client.get(self.PROFILE_URL)
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data['email'], self.email)
