"""
TC-CFG-01: API Key 配置
测试内容: 为模型填入 API Key，验证保存和读取
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tests.factories import AIModelFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_CFG_01_APIKeyConfigTest(TestCase):
    """API Key 配置测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    AI_SETTING_URL = '/api/v1/settings/ai/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'cfguser@example.com'
        cls.password = 'ConfigPass123!'
        cls.user = User.objects.create_user(
            username='cfguser',
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

    def test_01_get_default_settings(self):
        """GET 返回默认设置（空 api_keys）。"""
        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('api_keys', resp.data)
        self.assertEqual(resp.data['api_keys'], {})

    def test_02_save_api_keys(self):
        """保存 API Key 后在 GET 中返回。"""
        resp = self.client.patch(self.AI_SETTING_URL, {
            'api_keys': {str(self.model.pk): 'sk-test-key-123'},
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.data['api_keys'][str(self.model.pk)], 'sk-test-key-123')

    def test_03_update_api_keys_persists(self):
        """更新 API Key 后数据库持久化。"""
        self.client.patch(self.AI_SETTING_URL, {
            'api_keys': {str(self.model.pk): 'sk-new-key'},
        }, format='json')

        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.data['api_keys'][str(self.model.pk)], 'sk-new-key')

    def test_04_multiple_model_keys(self):
        """支持为多个模型配置 Key。"""
        model2 = AIModelFactory(name='GPT-5', model_slug='gpt-5')
        self.client.patch(self.AI_SETTING_URL, {
            'api_keys': {
                str(self.model.pk): 'sk-key-1',
                str(model2.pk): 'sk-key-2',
            },
        }, format='json')

        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(len(resp.data['api_keys']), 2)

    def test_05_empty_api_keys_resets(self):
        """提交空 api_keys 清空已配置的 Key。"""
        self.client.patch(self.AI_SETTING_URL, {
            'api_keys': {str(self.model.pk): 'sk-temp'},
        }, format='json')
        self.client.patch(self.AI_SETTING_URL, {
            'api_keys': {},
        }, format='json')

        resp = self.client.get(self.AI_SETTING_URL)
        self.assertEqual(resp.data['api_keys'], {})
