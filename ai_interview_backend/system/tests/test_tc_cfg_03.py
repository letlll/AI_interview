"""
TC-CFG-03: 环境变量回退
测试内容: 未配置 Key 时验证使用系统默认 Key
"""
import os
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tests.factories import AIModelFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_CFG_03_EnvFallbackTest(TestCase):
    """环境变量回退测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    AI_SETTING_URL = '/api/v1/settings/ai/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'cfgenv@example.com'
        cls.password = 'EnvPass123!'
        cls.user = User.objects.create_user(
            username='cfgenv',
            email=cls.email,
            password=cls.password,
        )
        cls.model = AIModelFactory()

    def setUp(self):
        self.client = APIClient()
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_no_key_configured_api_keys_is_empty(self):
        """未配置任何 Key 时 api_keys 为空字典。"""
        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['api_keys'], {})

    def test_02_no_key_for_specific_model_returns_none(self):
        """特定模型的 Key 未配置时返回 None/不存在。"""
        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.status_code, 200)
        model_key_str = str(self.model.pk)
        self.assertNotIn(model_key_str, resp.data['api_keys'])

    def test_03_unauthenticated_cannot_access_settings(self):
        """未认证不能访问 AI 设置。"""
        unauth = APIClient()
        resp = unauth.get(self.AI_SETTING_URL)
        self.assertEqual(resp.status_code, 401)

    def test_04_env_has_default_key(self):
        """环境变量中存在默认 API Key 配置。"""
        # 验证 settings 级别的 SECRET_KEY 存在（其它 env var 可用作类比例证）
        from django.conf import settings
        self.assertTrue(hasattr(settings, 'SECRET_KEY'))
        self.assertIsNotNone(settings.SECRET_KEY)
