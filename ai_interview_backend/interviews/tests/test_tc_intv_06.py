"""
TC-INTV-06: 语音回答
测试内容: 语音输入（answer_text 文本化后提交），验证存储和与普通回答的兼容性
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.models import InterviewSession, InterviewQuestion
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_06_VoiceAnswerTest(TestCase):
    """语音回答测试。"""

    START_URL = '/api/v1/interviews/start/'
    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv06@example.com'
        cls.password = 'Intv06Pass!'
        cls.user = User.objects.create_user(
            username='intv06', email=cls.email, password=cls.password,
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('interview_question', question='首题')
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

    def _start_session(self, question_count=1):
        resp = self.client.post(self.START_URL, {
            'job_position': 'Python 开发', 'question_count': question_count,
        }, format='json')
        return resp.data['id'], resp.data['questions'][0]['id']

    # ── 语音识别文本提交 ──

    def test_01_voice_transcribed_answer_saved(self):
        """语音识别后的文本提交，answer_text 正常保存。"""
        session_id, q_id = self._start_session(1)
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id,
            'answer_text': '（语音识别结果）我认为 Python 的 GIL 限制...',
        }, format='json')

        q = InterviewQuestion.objects.get(id=q_id)
        self.assertEqual(
            q.answer_text,
            '（语音识别结果）我认为 Python 的 GIL 限制...',
        )

    def test_02_long_voice_answer_saved(self):
        """长语音回答（500+ 字）正常保存。"""
        session_id, q_id = self._start_session(1)
        long_answer = 'Python' * 200  # 1200 chars, no trailing spaces
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id, 'answer_text': long_answer,
        }, format='json')

        q = InterviewQuestion.objects.get(id=q_id)
        self.assertEqual(len(q.answer_text), len(long_answer))

    def test_03_voice_answer_triggers_feedback(self):
        """语音回答同样触发 AI 反馈生成。"""
        session_id, q_id = self._start_session(1)
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '语音识别的回答文本',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        q = InterviewQuestion.objects.get(id=q_id)
        self.assertIsNotNone(q.ai_feedback)

    def test_04_audio_url_field_exists(self):
        """InterviewQuestion 模型存在 audio_url 字段。"""
        session_id, q_id = self._start_session(1)
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        self.client.post(url, {
            'question_id': q_id, 'answer_text': '测试',
        }, format='json')

        q = InterviewQuestion.objects.get(id=q_id)
        # audio_url 默认为空字符串
        self.assertEqual(q.audio_url, '')

    def test_05_empty_answer_rejected(self):
        """空 answer_text 应被拒绝（allow_blank=False）。"""
        session_id, q_id = self._start_session(1)
        url = f'/api/v1/interviews/{session_id}/submit-answer-stream/'
        resp = self.client.post(url, {
            'question_id': q_id, 'answer_text': '',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
