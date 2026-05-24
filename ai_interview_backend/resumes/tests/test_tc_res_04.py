"""
TC-RES-04: 简历列表与详情
测试内容: 查看简历列表、获取单条详情、验证用户隔离
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from resumes.tests.factories import ResumeFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_04_ResumeListDetailTest(TestCase):
    """简历列表与详情测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res04@example.com'
        cls.password = 'Res04Pass!'
        cls.user = User.objects.create_user(
            username='res04', email=cls.email, password=cls.password,
        )
        # 为主用户创建 3 条简历
        cls.r1 = ResumeFactory(user=cls.user, title='简历A', status='draft')
        cls.r2 = ResumeFactory(user=cls.user, title='简历B', status='published')
        cls.r3 = ResumeFactory(user=cls.user, title='简历C', status='parsed')

        # 为其他用户创建 1 条简历
        cls.other = User.objects.create_user(
            username='other04', email='other04@test.com', password='Other04!',
        )
        cls.other_resume = ResumeFactory(user=cls.other, title='别人的简历')

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 列表 ──

    def test_01_list_returns_own_resumes(self):
        """列表只返回当前用户的简历。"""
        resp = self.client.get(self.LIST_URL)
        self.assertEqual(resp.status_code, 200)
        ids = {r['id'] for r in resp.data['results']}
        self.assertIn(self.r1.id, ids)
        self.assertIn(self.r2.id, ids)
        self.assertIn(self.r3.id, ids)
        self.assertNotIn(self.other_resume.id, ids)

    def test_02_list_ordered_by_updated_at_desc(self):
        """列表按 updated_at 降序排列。"""
        resp = self.client.get(self.LIST_URL)
        results = resp.data['results']
        self.assertEqual(results[0]['id'], self.r3.id)  # 最后创建的最先

    # ── 详情 ──

    def test_03_detail_returns_full_resume(self):
        """详情返回简历的完整字段。"""
        resp = self.client.get(f'{self.LIST_URL}{self.r1.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], '简历A')
        self.assertIn('content_json', resp.data)
        self.assertIn('template_name', resp.data)
        self.assertIn('skills', resp.data)

    def test_04_detail_includes_nested_fields(self):
        """详情包含技能、教育等嵌套字段。"""
        resp = self.client.get(f'{self.LIST_URL}{self.r1.id}/')
        self.assertIn('skills', resp.data)
        self.assertIn('educations', resp.data)
        self.assertIn('work_experiences', resp.data)

    def test_05_detail_other_user_returns_404(self):
        """不能查看其他用户的简历详情。"""
        resp = self.client.get(f'{self.LIST_URL}{self.other_resume.id}/')
        self.assertEqual(resp.status_code, 404)

    def test_06_list_unauthenticated_returns_401(self):
        """未认证请求列表返回 401。"""
        anon = APIClient()
        resp = anon.get(self.LIST_URL)
        self.assertEqual(resp.status_code, 401)
