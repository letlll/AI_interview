"""
TC-INTV-08: 中断与恢复
测试内容: 模拟浏览器中断/关闭后在新设备恢复面试，验证缓存和状态
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession, InterviewQuestion
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_08_InterruptResumeTest(TestCase):
    """中断与恢复面试测试。"""

    START_URL = '/api/v1/interviews/start/'
    CHECK_URL = '/api/v1/interviews/check-unfinished/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv08@example.com'
        cls.password = 'Intv08Pass!'
        cls.user = User.objects.create_user(
            username='intv08', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
        self.mock_ai.set_response('interview_followup', question='追问')
        self.mock_ai.set_response('interview_feedback', score=80, feedback='不错')
        self.mock_ai.enable()
        self.client = APIClient()
        self._auth()
        cache.clear()

    def tearDown(self):
        self.mock_ai.disable()

    def _auth(self):
        resp = self.client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

    def _new_client(self):
        """模拟"新浏览器/新设备"——创建新的 APIClient 并重新认证。"""
        new_client = APIClient()
        resp = new_client.post(self.LOGIN_URL, {
            'email': self.email, 'password': self.password,
        }, format='json')
        new_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')
        return new_client

    # ── 中断检测 ──

    def test_01_interrupt_detected_by_cache(self):
        """开始面试后，check_unfinished 能检测到未完成。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')

        resp = self.client.get(self.CHECK_URL)
        self.assertTrue(resp.data['has_unfinished'])

    def test_02_resume_from_new_client(self):
        """"新浏览器"登录后仍可检测到未完成面试（缓存共享）。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')

        new_client = self._new_client()
        resp = new_client.get(self.CHECK_URL)
        self.assertTrue(resp.data['has_unfinished'])

    def test_03_session_detail_accessible_after_interrupt(self):
        """"中断"后仍可通过 API 查看 session 详情。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        session_id = resp.data['id']

        new_client = self._new_client()
        detail = new_client.get(f'/api/v1/interviews/{session_id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['job_position'], 'Python 开发')

    # ── 强制覆盖 ──

    def test_04_force_start_cancels_old_session(self):
        """force=true 开始新面试会取消旧 session。"""
        old = self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')
        old_id = old.data['id']

        resp = self.client.post(
            f'{self.START_URL}?force=true',
            {'job_position': '前端开发'},
            format='json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['job_position'], '前端开发')

        old_session = InterviewSession.objects.get(id=old_id)
        self.assertEqual(old_session.status, InterviewSession.Status.CANCELED)

    def test_05_force_start_updates_cache(self):
        """force=true 后缓存指向新 session。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')

        new_resp = self.client.post(
            f'{self.START_URL}?force=true',
            {'job_position': '前端开发'},
            format='json',
        )
        new_id = new_resp.data['id']

        resp = self.client.get(self.CHECK_URL)
        self.assertTrue(resp.data['has_unfinished'])
        self.assertEqual(str(resp.data['session_id']), new_id)

    # ── 恢复后继续问答 ──

    def test_06_continue_after_resume(self):
        """"恢复"后可以继续提交答案。"""
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': 3,
        }, format='json')
        session_id = resp.data['id']
        q_id = resp.data['questions'][0]['id']

        # "中断"——切换到新客户端
        new_client = self._new_client()

        # 用新客户端提交答案
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = new_client.post(url, {
            'question_id': q_id, 'answer_text': '恢复后的回答',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        # 下一题被创建
        count = InterviewQuestion.objects.filter(session_id=session_id).count()
        self.assertEqual(count, 2)

    # ── 并发保护 ──

    def test_07_concurrent_start_returns_409(self):
        """已存在未完成面试时，不传 force 尝试开始返回 409。"""
        self.client.post(self.START_URL, {
            'job_position': 'Python 开发',
        }, format='json')

        resp = self.client.post(self.START_URL, {
            'job_position': '前端开发',
        }, format='json')
        self.assertEqual(resp.status_code, 409)
