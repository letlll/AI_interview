"""
TC-AUTH-05: 个人信息修改
测试内容: 修改用户名、手机号等信息，验证保存成功
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_AUTH_05_ProfileUpdateTest(TestCase):
    """个人信息修改测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    PROFILE_URL = '/api/v1/auth/profile/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'profiletest@example.com'
        cls.password = 'ProfilePass123!'
        cls.user = User.objects.create_user(
            username='profiletest',
            email=cls.email,
            password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_get_profile_returns_user_data(self):
        """GET profile 返回用户信息。"""
        resp = self.client.get(self.PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['email'], self.email)
        self.assertIn('username', resp.data)
        self.assertIn('phone', resp.data)

    def test_02_update_username_succeeds(self):
        """修改 username 成功并持久化。"""
        resp = self.client.patch(self.PROFILE_URL, {
            'username': 'newusername',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newusername')

    def test_03_update_phone_succeeds(self):
        """修改手机号成功并持久化。"""
        resp = self.client.patch(self.PROFILE_URL, {
            'phone': '13912345678',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, '13912345678')

    def test_04_update_multiple_fields_succeeds(self):
        """同时修改 username + phone 成功。"""
        resp = self.client.put(self.PROFILE_URL, {
            'username': 'multiup', 'email': self.email,
            'phone': '13700001111',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'multiup')
        self.assertEqual(self.user.phone, '13700001111')

    def test_05_unauthenticated_returns_401(self):
        """未认证访问返回 401。"""
        unauth = APIClient()
        resp = unauth.get(self.PROFILE_URL)
        self.assertEqual(resp.status_code, 401)

    def test_06_has_password_field_returns_true(self):
        """profile 返回 has_password=True。"""
        resp = self.client.get(self.PROFILE_URL)
        self.assertIn('has_password', resp.data)
        self.assertTrue(resp.data['has_password'])
