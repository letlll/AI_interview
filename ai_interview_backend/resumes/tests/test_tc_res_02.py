"""
TC-RES-02: 在线创建简历
测试内容: 通过 API 在线创建简历（content_json + template_name），验证 JSON 字段
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_02_OnlineCreateResumeTest(TestCase):
    """在线创建简历测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res02@example.com'
        cls.password = 'Res02Pass!'
        cls.user = User.objects.create_user(
            username='res02', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 在线创建 ──

    def test_01_create_with_content_json(self):
        """通过 content_json 字段创建包含富文本内容的简历。"""
        content = {
            'content': '# 个人信息\n- 姓名: 李四\n- 岗位: 前端开发',
            'modules': [
                {'id': 'info', 'type': 'personal_info'},
                {'id': 'edu', 'type': 'education'},
            ],
        }
        resp = self.client.post(self.LIST_URL, {
            'title': '前端开发简历',
            'content_json': content,
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['title'], '前端开发简历')
        self.assertIsNotNone(resp.data['content_json'])

    def test_02_create_with_template_name(self):
        """创建简历时可指定模板。"""
        resp = self.client.post(self.LIST_URL, {
            'title': '模板简历',
            'template_name': 'modern',
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['template_name'], 'modern')

    def test_03_default_status_is_draft(self):
        """在线创建的简历默认状态为 draft。"""
        resp = self.client.post(self.LIST_URL, {
            'title': '草稿简历',
        }, format='json')

        self.assertEqual(resp.data['status'], 'draft')

    def test_04_create_with_status_published(self):
        """创建时可直接设为 published。"""
        resp = self.client.post(self.LIST_URL, {
            'title': '已发布简历', 'status': 'published',
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'published')

    def test_05_create_minimal_resume(self):
        """仅传 title 即可创建成功。"""
        resp = self.client.post(self.LIST_URL, {
            'title': '极简简历',
        }, format='json')

        self.assertEqual(resp.status_code, 201)
