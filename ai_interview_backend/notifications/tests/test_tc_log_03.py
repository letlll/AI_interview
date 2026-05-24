"""
TC-LOG-03: 标记已读
测试内容: 单条和全部标记已读，验证状态更新
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from notifications.models import ActivityLog

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_LOG_03_MarkReadTest(TestCase):
    """标记已读测试。"""

    LOGIN_URL = '/api/v1/auth/login/'
    LOG_LIST_URL = '/api/v1/activity-logs/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'logread@example.com'
        cls.password = 'MarkRead123!'
        cls.user = User.objects.create_user(
            username='logread',
            email=cls.email,
            password=cls.password,
        )
        cls.logs = []
        for i in range(4):
            log = ActivityLog.objects.create(
                user=cls.user, action_type='interview_completed',
                resource_type='interview', resource_id=f'intv-{i}',
            )
            cls.logs.append(log)

    def setUp(self):
        self.client = APIClient()
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def test_01_mark_single_as_read(self):
        """标记单条日志为已读。"""
        log = self.logs[0]
        self.assertFalse(log.is_read)

        resp = self.client.post(
            f'/api/v1/activity-logs/{log.pk}/mark-as-read/'
        )
        self.assertEqual(resp.status_code, 204)

        log.refresh_from_db()
        self.assertTrue(log.is_read)

    def test_02_mark_all_as_read(self):
        """全部标记已读。"""
        for log in self.logs:
            self.assertFalse(log.is_read)

        resp = self.client.post(
            '/api/v1/activity-logs/mark-all-as-read/'
        )
        self.assertEqual(resp.status_code, 204)

        unread = ActivityLog.objects.filter(
            user=self.user, is_read=False,
        ).count()
        self.assertEqual(unread, 0)

    def test_03_mark_read_twice_still_read(self):
        """重复标记已读不影响结果。"""
        log = self.logs[1]
        self.client.post(f'/api/v1/activity-logs/{log.pk}/mark-as-read/')
        resp = self.client.post(f'/api/v1/activity-logs/{log.pk}/mark-as-read/')
        self.assertEqual(resp.status_code, 204)
        log.refresh_from_db()
        self.assertTrue(log.is_read)

    def test_04_mark_read_nonexistent_returns_204(self):
        """标记不存在的日志不报错。"""
        resp = self.client.post('/api/v1/activity-logs/99999/mark-as-read/')
        self.assertEqual(resp.status_code, 204)

    def test_05_mark_all_does_not_affect_others(self):
        """全部已读不影响其他用户的日志。"""
        other = User.objects.create_user(
            username='other2', email='other2@test.com', password='Other1234!',
        )
        other_log = ActivityLog.objects.create(
            user=other, action_type='resume_exported',
            resource_type='resume', resource_id='r-88',
        )
        self.client.post('/api/v1/activity-logs/mark-all-as-read/')
        other_log.refresh_from_db()
        self.assertFalse(other_log.is_read)
