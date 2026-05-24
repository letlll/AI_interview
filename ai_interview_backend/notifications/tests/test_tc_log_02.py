"""
TC-LOG-02: 日志类型筛选
测试内容: 按资源类型筛选日志，验证过滤正确
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from notifications.models import ActivityLog

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_LOG_02_TypeFilterTest(TestCase):
    """日志类型筛选测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    LOG_LIST_URL = '/api/v1/activity-logs/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'logfilter@example.com'
        cls.password = 'FilterPass123!'
        cls.user = User.objects.create_user(
            username='logfilter',
            email=cls.email,
            password=cls.password,
        )
        # 创建多种类型的日志
        for i in range(3):
            ActivityLog.objects.create(
                user=cls.user, action_type='interview_completed',
                resource_type='interview', resource_id=f'intv-{i}',
            )
        for i in range(2):
            ActivityLog.objects.create(
                user=cls.user, action_type='resume_exported',
                resource_type='resume', resource_id=f'res-{i}',
            )
        for i in range(1):
            ActivityLog.objects.create(
                user=cls.user, action_type='report_generated',
                resource_type='report', resource_id=f'rpt-{i}',
            )

    def setUp(self):
        self.client = APIClient()
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_list_all_without_filter(self):
        """无筛选参数返回全部日志。"""
        resp = self.client.get(self.LOG_LIST_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 6)

    def test_02_filter_by_interview(self):
        """按 interview 类型筛选。"""
        resp = self.client.get(self.LOG_LIST_URL, {'resource_type': 'interview'})
        self.assertEqual(resp.status_code, 200)
        results = resp.data['results']
        self.assertEqual(len(results), 3)
        for item in results:
            self.assertEqual(item['resource_type'], 'interview')

    def test_03_filter_by_resume(self):
        """按 resume 类型筛选。"""
        resp = self.client.get(self.LOG_LIST_URL, {'resource_type': 'resume'})
        self.assertEqual(resp.status_code, 200)
        results = resp.data['results']
        self.assertEqual(len(results), 2)
        for item in results:
            self.assertEqual(item['resource_type'], 'resume')

    def test_04_filter_by_report(self):
        """按 report 类型筛选。"""
        resp = self.client.get(self.LOG_LIST_URL, {'resource_type': 'report'})
        self.assertEqual(resp.status_code, 200)
        results = resp.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['resource_type'], 'report')

    def test_05_invalid_resource_type_returns_all(self):
        """无效的资源类型参数被忽略，返回全部。"""
        resp = self.client.get(self.LOG_LIST_URL, {'resource_type': 'invalid'})
        self.assertEqual(resp.status_code, 200)
        # 无效参数不匹配三元判断，filter 未应用，返回全部
        self.assertEqual(resp.data['count'], 6)
