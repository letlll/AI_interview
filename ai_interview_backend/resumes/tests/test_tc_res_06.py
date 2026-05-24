"""
TC-RES-06: 删除简历
测试内容: 删除简历，验证数据移除和用户隔离
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from resumes.models import Resume
from resumes.tests.factories import ResumeFactory

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_RES_06_DeleteResumeTest(TestCase):
    """删除简历测试。"""

    LIST_URL = '/api/v1/resumes/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'res06@example.com'
        cls.password = 'Res06Pass!'
        cls.user = User.objects.create_user(
            username='res06', email=cls.email, password=cls.password,
        )
        cls.r1 = ResumeFactory(user=cls.user, title='待删除简历')
        cls.r2 = ResumeFactory(user=cls.user, title='保留简历')

    def setUp(self):
        self.client = APIClient()
        self._auth()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    # ── 删除 ──

    def test_01_delete_returns_204(self):
        """删除成功返回 204。"""
        url = f'{self.LIST_URL}{self.r1.id}/'
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 204)

    def test_02_delete_removes_from_db(self):
        """删除后数据库中不存在。"""
        url = f'{self.LIST_URL}{self.r1.id}/'
        self.client.delete(url)
        self.assertFalse(Resume.objects.filter(id=self.r1.id).exists())

    def test_03_delete_only_affects_target(self):
        """删除 A 不影响 B。"""
        self.client.delete(f'{self.LIST_URL}{self.r1.id}/')
        self.assertTrue(Resume.objects.filter(id=self.r2.id).exists())

    def test_04_delete_then_list_excludes_it(self):
        """删除后列表不再包含该项。"""
        self.client.delete(f'{self.LIST_URL}{self.r1.id}/')
        resp = self.client.get(self.LIST_URL)
        ids = {r['id'] for r in resp.data['results']}
        self.assertNotIn(self.r1.id, ids)
        self.assertIn(self.r2.id, ids)

    def test_05_other_user_cannot_delete(self):
        """不能删除其他用户的简历。"""
        other = User.objects.create_user(
            username='res06b', email='res06b@test.com', password='Other06!',
        )
        other_r = ResumeFactory(user=other, title='别人的')

        url = f'{self.LIST_URL}{other_r.id}/'
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Resume.objects.filter(id=other_r.id).exists())

    def test_06_delete_nonexistent_returns_404(self):
        """删除不存在的简历返回 404。"""
        resp = self.client.delete(f'{self.LIST_URL}99999/')
        self.assertEqual(resp.status_code, 404)
