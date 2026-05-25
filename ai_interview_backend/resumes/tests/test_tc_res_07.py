"""
TC-RES-07: JD 岗位匹配分析
测试内容: 提交 JD 文本与简历进行分析匹配，验证报告生成和分数
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from resumes.tests.factories import ResumeFactory
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_07_JDMatchTest(TestCase):
    """JD 岗位匹配分析测试。"""

    ANALYZE_URL = '/api/v1/analyze-resume/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res07@example.com'
        cls.password = 'Res07Pass!'
        cls.user = User.objects.create_user(
            username='res07', email=cls.email, password=cls.password,
        )
        cls.resume = ResumeFactory(
            user=cls.user, title='测试简历',
            content_json={'content': '# Python 开发工程师\n3年后端经验'},
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('jd_match', match_score=85,
                                   analysis='匹配度高',
                                   matched_keywords=['Python', 'Django'],
                                   missing_keywords=['AWS'])
        self.mock_ai.enable()
        self.client = APIClient()
        self._auth()

    def tearDown(self):
        self.mock_ai.disable()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 分析 ──

    def test_01_analyze_returns_201(self):
        """分析成功返回 201。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': self.resume.id,
            'jd_text': '需要 Python 后端开发，熟悉 Django 框架',
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_02_analyze_returns_overall_score(self):
        """分析结果包含 overall_score。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': self.resume.id,
            'jd_text': '需要 Python 后端开发',
        }, format='json')
        self.assertIn('overall_score', resp.data)
        self.assertGreater(resp.data['overall_score'], 0)

    def test_03_analyze_returns_report_data(self):
        """分析结果包含 report_data。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': self.resume.id,
            'jd_text': '需要 Python 后端开发',
        }, format='json')
        self.assertIsNotNone(resp.data['report_data'])

    # ── 异常场景 ──

    def test_04_missing_resume_id_returns_400(self):
        """缺少 resume_id 返回 400。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'jd_text': 'Python 开发 JD',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_05_missing_jd_text_returns_400(self):
        """缺少 jd_text 返回 400。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': self.resume.id,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_06_nonexistent_resume_returns_404(self):
        """引用不存在的简历返回 404。"""
        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': 99999,
            'jd_text': 'JD 内容',
        }, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_07_other_user_resume_returns_404(self):
        """使用其他用户的简历分析返回 404。"""
        other = User.objects.create_user(
            username='res07b', email='res07b@test.com', password='Other07!',
        )
        other_r = ResumeFactory(user=other, title='别人的简历',
                                 content_json={'content': '# 别人的'})

        resp = self.client.post(self.ANALYZE_URL, {
            'resume_id': other_r.id,
            'jd_text': 'JD 内容',
        }, format='json')
        self.assertEqual(resp.status_code, 404)
