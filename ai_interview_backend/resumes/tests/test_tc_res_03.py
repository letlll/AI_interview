"""
TC-RES-03: 简历解析
测试内容: 上传文件后自动解析出文本内容，验证 parsed_content 和状态
"""
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_03_ResumeParseTest(TestCase):
    """简历解析测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res03@example.com'
        cls.password = 'Res03Pass!'
        cls.user = User.objects.create_user(
            username='res03', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 解析成功 ──

    @patch('resumes.views.extract_text_from_file')
    def test_01_parse_sets_status_to_parsed(self, mock_extract):
        """成功解析后 status 变为 parsed。"""
        mock_extract.return_value = '提取的文本内容'
        file = SimpleUploadedFile('resume.pdf', b'fake pdf',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '解析测试', 'file': file,
        }, format='multipart')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'parsed')

    @patch('resumes.views.extract_text_from_file')
    def test_02_parse_sets_parsed_content(self, mock_extract):
        """解析成功后 parsed_content 不为空。"""
        mock_extract.return_value = '个人简历：张三，3年经验...'
        file = SimpleUploadedFile('resume.pdf', b'fake pdf',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '解析内容测试', 'file': file,
        }, format='multipart')

        self.assertIn('张三', resp.data['parsed_content'])

    @patch('resumes.views.extract_text_from_file')
    def test_03_parse_empty_result_sets_failed(self, mock_extract):
        """解析返回空内容时 status 为 failed。"""
        mock_extract.return_value = ''
        file = SimpleUploadedFile('resume.pdf', b'fake pdf',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '空解析', 'file': file,
        }, format='multipart')

        self.assertEqual(resp.data['status'], 'failed')

    # ── 解析失败 ──

    @patch('resumes.views.extract_text_from_file')
    def test_04_parse_exception_sets_failed(self, mock_extract):
        """解析抛出异常时 status 为 failed。"""
        mock_extract.side_effect = Exception('解析崩溃')
        file = SimpleUploadedFile('resume.pdf', b'fake pdf',
                                   content_type='application/pdf')
        resp = self.client.post(self.LIST_URL, {
            'title': '异常测试', 'file': file,
        }, format='multipart')

        self.assertEqual(resp.data['status'], 'failed')

    def test_05_unsupported_file_type_returns_empty(self):
        """不支持的文件类型解析后 parsed_content 为空。"""
        file = SimpleUploadedFile('notes.txt', b'plain text content',
                                   content_type='text/plain')
        resp = self.client.post(self.LIST_URL, {
            'title': 'TXT 文件', 'file': file,
        }, format='multipart')

        self.assertEqual(resp.status_code, 201)
        # TXT 不被支持，所以解析后内容为空
        self.assertEqual(resp.data['parsed_content'], '')
