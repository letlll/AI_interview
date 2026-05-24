"""
TC-INTV-07: AI 参考答案
测试内容: 点击查看参考答案，验证内容生成和缓存
"""
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from interviews.tests.factories import InterviewSessionFactory, InterviewQuestionFactory
from tests.mock_ai_service import MockAIService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TC_INTV_07_ReferenceAnswerTest(TestCase):
    """AI 参考答案查看测试。"""

    LOGIN_URL = '/api/v1/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.email = 'intv07@example.com'
        cls.password = 'Intv07Pass!'
        cls.user = User.objects.create_user(
            username='intv07', email=cls.email, password=cls.password,
        )
        cls.session = InterviewSessionFactory(
            user=cls.user, status='running', question_count=3,
        )
        cls.question = InterviewQuestionFactory(
            session=cls.session, sequence=1,
            question_text='请描述你的项目经验',
        )

    def setUp(self):
        self.mock_ai = MockAIService()
        self.mock_ai.set_response('reference_answer', answer='STAR 格式参考答案')
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

    def test_01_get_reference_answer_returns_200(self):
        """获取参考答案返回 200 + answer。"""
        url = f'/api/v1/interviews/questions/{self.question.pk}/reference-answer/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('answer', resp.data)
        self.assertIn('STAR', resp.data['answer'])

    def test_02_reference_answer_is_cached(self):
        """参考答案命中缓存。"""
        url = f'/api/v1/interviews/questions/{self.question.pk}/reference-answer/'
        # First call populates cache
        self.client.get(url)
        # Second call should use cache
        self.mock_ai.disable()  # disable AI — if cached, should work
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    def test_03_other_user_cannot_access_question(self):
        """其他用户不能访问别人的问题参考答案。"""
        other = User.objects.create_user(
            username='other07', email='other07@test.com', password='Other07!',
        )
        other_session = InterviewSessionFactory(user=other, status='running')
        other_q = InterviewQuestionFactory(
            session=other_session, sequence=1, question_text='其他用户的问题',
        )
        url = f'/api/v1/interviews/questions/{other_q.pk}/reference-answer/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 404)
