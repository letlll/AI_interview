"""
TC-RES-05: 编辑简历
测试内容: 更新简历字段（title, content_json, status），验证 PATCH 和 PUT
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from resumes.tests.factories import ResumeFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_05_EditResumeTest(TestCase):
    """编辑简历测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res05@example.com'
        cls.password = 'Res05Pass!'
        cls.user = User.objects.create_user(
            username='res05', email=cls.email, password=cls.password,
        )
        cls.resume = ResumeFactory(
            user=cls.user, title='原始标题',
            content_json={'content': '# 原始内容'},
            template_name='default',
        )

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── PATCH 局部更新 ──

    def test_01_patch_title(self):
        """PATCH 更新标题。"""
        url = f'{self.LIST_URL}{self.resume.id}/'
        resp = self.client.patch(url, {'title': '新标题'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], '新标题')

    def test_02_patch_content_json(self):
        """PATCH 更新 content_json。"""
        url = f'{self.LIST_URL}{self.resume.id}/'
        new_content = {'content': '# 更新后的内容'}
        resp = self.client.patch(url, {'content_json': new_content}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['content_json'], new_content)

    def test_03_patch_status(self):
        """PATCH 更新状态为 published。"""
        url = f'{self.LIST_URL}{self.resume.id}/'
        resp = self.client.patch(url, {'status': 'published'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'published')

    # ── PUT 全量更新 ──

    def test_04_put_full_update(self):
        """PUT 全量替换简历字段。"""
        url = f'{self.LIST_URL}{self.resume.id}/'
        resp = self.client.put(url, {
            'title': '完全替换',
            'status': 'published',
            'content_json': {'content': '# 新内容'},
            'template_name': 'modern',
            'full_name': '王五',
            'phone': '13900001111',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], '完全替换')
        self.assertEqual(resp.data['template_name'], 'modern')
        self.assertEqual(resp.data['full_name'], '王五')

    def test_05_other_user_cannot_edit(self):
        """其他用户不能编辑别人的简历。"""
        other = User.objects.create_user(
            username='res05b', email='res05b@test.com', password='Other05!',
        )
        other_r = ResumeFactory(user=other, title='别人的')

        url = f'{self.LIST_URL}{other_r.id}/'
        resp = self.client.patch(url, {'title': 'hack'}, format='json')
        self.assertEqual(resp.status_code, 404)
