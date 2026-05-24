"""
TC-LOG-01: 操作日志自动记录
测试内容: 执行面试、简历操作后验证日志自动生成
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from notifications.models import ActivityLog

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_LOG_01_AutoRecordTest(TestCase):
    """操作日志自动记录测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    LOG_LIST_URL = '/api/v1/activity-logs/'
    LOG_CREATE_URL = '/api/v1/activity-logs/log/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'loguser@example.com'
        cls.password = 'LogPass123!'
        cls.user = User.objects.create_user(
            username='loguser',
            email=cls.email,
            password=cls.password,
        )

    def setUp(self):
        self.client = APIClient()
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_create_log_via_api(self):
        """通过 API 创建日志并验证数据库记录。"""
        resp = self.client.post(self.LOG_CREATE_URL, {
            'action_type': 'resume_generated',
            'action_status': 'success',
            'resource_type': 'resume',
            'resource_id': 'resume-001',
            'action_data': {'template': 'modern'},
        }, format='json')
        self.assertEqual(resp.status_code, 201)

        log = ActivityLog.objects.filter(user=self.user).last()
        self.assertIsNotNone(log)
        self.assertEqual(log.action_type, 'resume_generated')
        self.assertEqual(log.resource_type, 'resume')
        self.assertEqual(log.resource_id, 'resume-001')
        self.assertFalse(log.is_read)

    def test_02_log_has_auto_timestamp(self):
        """日志自动记录时间戳。"""
        self.client.post(self.LOG_CREATE_URL, {
            'action_type': 'resume_generated',
            'action_status': 'success',
            'resource_type': 'resume',
            'resource_id': 'resume-002',
        }, format='json')

        log = ActivityLog.objects.filter(user=self.user).last()
        self.assertIsNotNone(log.timestamp)

    def test_03_list_logs_returns_user_only(self):
        """list 接口只返回当前用户的日志。"""
        other = User.objects.create_user(
            username='other', email='other@test.com', password='Other123!',
        )
        ActivityLog.objects.create(
            user=other, action_type='resume_exported',
            resource_type='resume', resource_id='r-99',
        )
        self.client.post(self.LOG_CREATE_URL, {
            'action_type': 'resume_generated',
            'action_status': 'success',
            'resource_type': 'resume',
            'resource_id': 'resume-003',
        }, format='json')

        resp = self.client.get(self.LOG_LIST_URL)
        self.assertEqual(resp.status_code, 200)
        results = resp.data['results']
        all_ids = [item['resource_id'] for item in results]
        self.assertIn('resume-003', all_ids)
        self.assertNotIn('r-99', all_ids)

    def test_04_log_default_is_read_false(self):
        """新创建的日志 is_read 默认为 False。"""
        self.client.post(self.LOG_CREATE_URL, {
            'action_type': 'resume_generated',
            'action_status': 'success',
            'resource_type': 'resume',
            'resource_id': 'resume-004',
        }, format='json')
        log = ActivityLog.objects.filter(user=self.user).last()
        self.assertFalse(log.is_read)

    def test_05_action_data_stored_as_json(self):
        """action_data 以 JSON 格式存储。"""
        self.client.post(self.LOG_CREATE_URL, {
            'action_type': 'resume_generated',
            'action_status': 'success',
            'resource_type': 'resume',
            'resource_id': 'resume-005',
            'action_data': {'source': 'upload', 'pages': 2},
        }, format='json')
        log = ActivityLog.objects.filter(user=self.user).last()
        self.assertEqual(log.action_data['source'], 'upload')
        self.assertEqual(log.action_data['pages'], 2)
