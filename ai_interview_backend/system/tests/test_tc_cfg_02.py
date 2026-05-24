"""
TC-CFG-02: 默认模型切换
测试内容: 更改默认模型，验证 AI 调用使用新模型
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from tests.factories import AIModelFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_CFG_02_ModelSwitchTest(TestCase):
    """默认模型切换测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    AI_SETTING_URL = '/api/v1/settings/ai/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'cfgmodel@example.com'
        cls.password = 'ModelPass123!'
        cls.user = User.objects.create_user(
            username='cfgmodel',
            email=cls.email,
            password=cls.password,
        )
        cls.model1 = AIModelFactory(name='DeepSeek', model_slug='deepseek-chat')
        cls.model2 = AIModelFactory(name='GPT-4o', model_slug='gpt-4o')

    def setUp(self):
        self.client = APIClient()
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_default_model_is_null_initially(self):
        """初始无默认模型。"""
        resp = self.client.get(self.AI_SETTING_URL)
        self.assertIsNone(resp.data['ai_model'])

    def test_02_set_default_model(self):
        """设置默认模型成功。"""
        resp = self.client.patch(self.AI_SETTING_URL, {
            'ai_model_id': self.model1.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data['ai_model'])
        self.assertEqual(resp.data['ai_model']['id'], self.model1.pk)

    def test_03_switch_default_model(self):
        """切换默认模型为新模型。"""
        self.client.patch(self.AI_SETTING_URL, {
            'ai_model_id': self.model1.pk,
        }, format='json')

        resp = self.client.patch(self.AI_SETTING_URL, {
            'ai_model_id': self.model2.pk,
        }, format='json')
        self.assertEqual(resp.data['ai_model']['id'], self.model2.pk)
        self.assertEqual(resp.data['ai_model']['model_slug'], 'gpt-4o')

    def test_04_clear_default_model(self):
        """清除默认模型。"""
        self.client.patch(self.AI_SETTING_URL, {
            'ai_model_id': self.model1.pk,
        }, format='json')
        resp = self.client.patch(self.AI_SETTING_URL, {
            'ai_model_id': None,
        }, format='json')
        self.assertIsNone(resp.data['ai_model'])

    def test_05_model_list_public(self):
        """模型列表接口公开可访问。"""
        unauth = APIClient()
        resp = unauth.get('/api/v1/ai-models/')
        self.assertEqual(resp.status_code, 200)
        results = resp.data['results']
        slugs = [m['model_slug'] for m in results]
        self.assertIn('deepseek-chat', slugs)
        self.assertIn('gpt-4o', slugs)
