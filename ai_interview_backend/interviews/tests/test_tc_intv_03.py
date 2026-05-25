"""
TC-INTV-03: 提交答案（SSE 流式）
测试内容: 提交回答，验证流式返回下一题、反馈保存、新题目创建
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession, InterviewQuestion
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_03_SubmitAnswerTest(TestCase):
    """提交答案与 SSE 流式下一题测试。"""

    START_URL = '/api/v1/interviews/start/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv03@example.com'
        cls.password = 'Intv03Pass!'
        cls.user = User.objects.create_user(
            username='intv03', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
        self.mock_ai.set_response('interview_followup', question='追问题目内容')
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

    def _start_session(self, question_count=3):
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': question_count,
        }, format='json')
        return resp.data['id'], resp.data['questions'][0]['id']

    # ── 最终题提交（非流式分支） ──

    def test_01_submit_last_answer_returns_finished(self):
        """提交最后一题返回 interview_finished=True（非流式）。"""
        session_id, q_id = self._start_session(question_count=1)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '我的最终回答',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['interview_finished'])
        self.assertIn('feedback', resp.data)

    def test_02_submit_last_answer_saves_answer_text(self):
        """提交最终题后 answer_text 被保存。"""
        session_id, q_id = self._start_session(question_count=1)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id, 'answer_text': '我的最终回答',
        }, format='json')

        q = InterviewQuestion.objects.get(id=q_id)
        self.assertEqual(q.answer_text, '我的最终回答')
        self.assertIsNotNone(q.answered_at)

    def test_03_submit_last_answer_saves_feedback(self):
        """提交最终题后 ai_feedback 被保存。"""
        session_id, q_id = self._start_session(question_count=1)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id, 'answer_text': '我的回答',
        }, format='json')

        q = InterviewQuestion.objects.get(id=q_id)
        self.assertIsNotNone(q.ai_feedback)
        self.assertIn('feedback', q.ai_feedback)

    # ── 非最终题提交（流式分支） ──

    def test_04_submit_non_final_returns_stream(self):
        """非最终题提交返回流式响应（StreamingHttpResponse）。"""
        session_id, q_id = self._start_session(question_count=3)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '中间回答',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertIn('X-Feedback', resp.headers)

    def test_05_submit_non_final_creates_next_question(self):
        """非最终题提交后下一题被创建到数据库。"""
        session_id, q_id = self._start_session(question_count=3)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '中间回答',
        }, format='json')
        # 流式响应需消费 streaming_content 以触发数据库中问题创建
        b"".join(resp.streaming_content)

        count = InterviewQuestion.objects.filter(session_id=session_id).count()
        self.assertEqual(count, 2)  # Q1 + 流式新创建的 Q2

    # ── 异常场景 ──

    def test_06_submit_to_finished_session_returns_400(self):
        """向已结束的 session 提交答案返回 400。"""
        session_id, q_id = self._start_session(question_count=1)

        # 先提交最终题结束面试
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id, 'answer_text': '回答',
        }, format='json')
        # finish 面试
        self.client.post(f'/api/v1/interviews/{session_id}/finish/')

        # 再次提交
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '再回答一次',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_07_submit_invalid_question_returns_404(self):
        """提交不存在的 question_id 返回 404。"""
        session_id, _ = self._start_session(question_count=3)

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': 99999, 'answer_text': '回答',
        }, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_08_other_user_cannot_submit_to_session(self):
        """其他用户不能向别人的 session 提交答案。"""
        session_id, q_id = self._start_session(question_count=3)

        # 创建另一个用户并登录
        other = User.objects.create_user(
            username='intv03b', email='intv03b@test.com', password='Other03!',
        )
        other_client = APIClient()
        resp = other_client.post(self.LOGIN_URL, {
            'email': 'intv03b@test.com', 'password': 'Other03!',
        }, format='json')
        other_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')

        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = other_client.post(url, {
            'question_id': q_id, 'answer_text': '别人的回答',
        }, format='json')
        self.assertEqual(resp.status_code, 404)
