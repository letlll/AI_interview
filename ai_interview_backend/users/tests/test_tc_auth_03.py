"""
TC-AUTH-03: 登录失败
测试内容: 输入错误密码，验证返回 401 错误提示
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_AUTH_03_LoginFailureTest(TestCase):
    """登录失败测试。"""

    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'failtest@example.com'
        cls.correct_password = 'RightPass123!'
        cls.user = User.objects.create_user(
            username='failtest',
            email=cls.email,
            password=cls.correct_password,
        )

    def setUp(self):
        self.client = APIClient()

    def test_01_wrong_password_returns_401(self):
        """错误密码返回 401。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': 'WrongPass456!',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_02_nonexistent_email_returns_401(self):
        """不存在的邮箱返回 401。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': 'noone@example.com', 'password': self.correct_password,
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_03_blank_email_returns_400(self):
        """空邮箱返回 400 或 401。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': '', 'password': self.correct_password,
        }, format='json')
        self.assertIn(resp.status_code, [400, 401])

    def test_04_blank_password_returns_400(self):
        """空密码返回 400 或 401。"""
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': '',
        }, format='json')
        self.assertIn(resp.status_code, [400, 401])

    def test_05_missing_email_field_returns_400(self):
        """缺少 email 字段返回 400 或 401。"""
        resp = self.client.post(self.LOGIN_URL, {
            'password': self.correct_password,
        }, format='json')
        self.assertIn(resp.status_code, [400, 401])

    def test_06_three_wrong_passwords_still_401(self):
        """连续三次错误密码均返回 401（无账号锁定）。"""
        for i in range(3):
            resp = self.client.post(self.LOGIN_URL, {
                'email': self.email, 'password': f'Wrong{i}',
            }, format='json')
            self.assertEqual(resp.status_code, 401)
