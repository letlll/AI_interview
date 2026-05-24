"""
TC-AUTH-01: 邮箱注册
测试内容: 输入有效邮箱和密码，验证注册成功并自动登录
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_AUTH_01_RegistrationTest(TestCase):
    """邮箱注册测试——验证用户创建与 Token 签发。"""

    REGISTER_URL = '/api/v1/auth/register/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'newuser@example.com'
        cls.password = 'SecurePass123!'
        cls.username = 'newuser'

    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def _set_code(self, email, code='ABC123'):
        cache.set(f'email_code_{email}', code, timeout=300)

    def test_01_register_creates_user(self):
        """注册成功：用户被创建，可登录获取 Token。"""
        self._set_code(self.email)

        response = self.client.post(self.REGISTER_URL, {
            'username': self.username,
            'email': self.email,
            'password': self.password,
            'code': 'ABC123',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email=self.email).exists())

        user = User.objects.get(email=self.email)
        self.assertEqual(user.username, self.username)

    def test_02_register_missing_code_fails(self):
        """缺少验证码返回 400。"""
        response = self.client.post(self.REGISTER_URL, {
            'username': self.username,
            'email': self.email,
            'password': self.password,
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_03_wrong_code_fails(self):
        """错误验证码返回 400。"""
        self._set_code(self.email, 'XYZ999')
        response = self.client.post(self.REGISTER_URL, {
            'username': self.username, 'email': self.email,
            'password': self.password, 'code': 'WRONG1',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_04_expired_code_fails(self):
        """无缓存验证码（模拟过期）返回 400。"""
        response = self.client.post(self.REGISTER_URL, {
            'username': self.username, 'email': self.email,
            'password': self.password, 'code': 'EXPIRED',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_05_duplicate_email_fails(self):
        """重复邮箱返回 400。"""
        User.objects.create_user(username='dup', email=self.email, password='DupPass123!')
        self._set_code(self.email)
        response = self.client.post(self.REGISTER_URL, {
            'username': self.username, 'email': self.email,
            'password': self.password, 'code': 'ABC123',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_06_register_then_login_returns_tokens(self):
        """注册后登录获取 JWT Token Pair。"""
        self._set_code(self.email)
        reg = self.client.post(self.REGISTER_URL, {
            'username': self.username, 'email': self.email,
            'password': self.password, 'code': 'ABC123',
        }, format='json')
        self.assertEqual(reg.status_code, 201)

        login = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertIn('access', login.data)
        self.assertIn('refresh', login.data)
