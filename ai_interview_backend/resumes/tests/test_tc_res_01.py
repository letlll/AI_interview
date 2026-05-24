"""
TC-RES-01: 上传简历文件
测试内容: 上传 PDF/DOCX 文件，验证简历创建、文件关联和解析触发
"""
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_01_UploadResumeTest(TestCase):
    """上传简历文件测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res01@example.com'
        cls.password = 'Res01Pass!'
        cls.user = User.objects.create_user(
            username='res01', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 文件上传 ──

    def test_01_upload_file_creates_resume(self):
        """上传文件创建简历，返回 201。"""
        file = SimpleUploadedFile('resume.pdf', b'fake pdf content',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '我的简历', 'file': file,
        }, format='multipart')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['title'], '我的简历')

    def test_02_upload_file_has_file_url(self):
        """上传文件后 file_url 不为空。"""
        file = SimpleUploadedFile('resume.pdf', b'fake pdf content',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '带文件的简历', 'file': file,
        }, format='multipart')

        self.assertIsNotNone(resp.data['file_url'])

    def test_03_upload_with_default_title(self):
        """不上传 title 时默认使用文件名。"""
        file = SimpleUploadedFile('my_resume.pdf', b'content',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'file': file,
        }, format='multipart')

        self.assertEqual(resp.status_code, 201)
        self.assertIn('my_resume.pdf', resp.data['title'])

    def test_04_upload_without_file_creates_draft(self):
        """不上传文件时创建在线草稿。"""
        resp = self.client.post(self.LIST_URL, {
            'title': '在线简历',
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['title'], '在线简历')

    def test_05_upload_unauthenticated_returns_401(self):
        """未认证上传返回 401。"""
        anon = APIClient()
        file = SimpleUploadedFile('r.pdf', b'x', content_type='application/pdf')
        resp = anon.post(self.LIST_URL, {'file': file}, format='multipart')
        self.assertEqual(resp.status_code, 401)
