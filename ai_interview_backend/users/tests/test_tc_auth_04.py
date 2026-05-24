"""
TC-AUTH-04: Token 刷新
测试内容: Access Token 过期后自动使用 Refresh Token 刷新
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_AUTH_04_TokenRefreshTest(TestCase):
    """Token 刷新机制测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    REFRESH_URL = '/api/v1/auth/token/refresh/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'refreshtest@example.com'
        cls.password = 'RefreshPass123!'
        cls.user = User.objects.create_user(
            username='refreshtest',
            email=cls.email,
            password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()

    def _login(self):
        return self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')

    def test_01_refresh_returns_new_access_token(self):
        """使用有效 Refresh Token 获取新 Access Token。"""
        resp = self._login()
        refresh = resp.data['refresh']
        r = self.client.post(self.REFRESH_URL, {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)

    def test_02_refreshed_token_differs_from_original(self):
        """新 Access Token 与旧 Token 不同。"""
        resp = self._login()
        old = resp.data['access']
        refresh = resp.data['refresh']
        r = self.client.post(self.REFRESH_URL, {'refresh': refresh}, format='json')
        self.assertNotEqual(old, r.data['access'])

    def test_03_new_token_can_access_protected_api(self):
        """刷新后的 Token 可访问受保护接口。"""
        resp = self._login()
        r = self.client.post(self.REFRESH_URL, {
            'refresh': resp.data['refresh'],
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')
        profile = self.client.get('/api/v1/auth/profile/')
        self.assertEqual(profile.status_code, 200)

    def test_04_invalid_refresh_returns_401(self):
        """无效 Refresh Token 返回 401。"""
        resp = self.client.post(self.REFRESH_URL, {
            'refresh': 'not_a_real_token',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_05_expired_refresh_returns_401(self):
        """过期 Refresh Token 返回 401。"""
        token = RefreshToken.for_user(self.user)
        token.set_exp(lifetime=timedelta(seconds=-1))
        resp = self.client.post(self.REFRESH_URL, {
            'refresh': str(token),
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_06_access_as_refresh_returns_401(self):
        """用 Access Token 当 Refresh Token 返回 401。"""
        resp = self._login()
        r = self.client.post(self.REFRESH_URL, {
            'refresh': resp.data['access'],
        }, format='json')
        self.assertEqual(r.status_code, 401)
