""" interviews/tests/ 模块专用 Factory """
import factory
import uuid
from interviews.models import InterviewSession, InterviewQuestion
from tests.factories import UserFactory


class InterviewSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = InterviewSession

    id = factory.LazyFunction(uuid.uuid4)
    user = factory.SubFactory(UserFactory)
    job_position = 'Python 开发工程师'
    difficulty = InterviewSession.Difficulty.MEDIUM
    question_count = 3
    status = InterviewSession.Status.PENDING
    started_at = None
    finished_at = None
    report = None


class InterviewQuestionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = InterviewQuestion

    session = factory.SubFactory(InterviewSessionFactory)
    question_text = '请做自我介绍'
    sequence = 1
    answer_text = ''
    analysis_data = None
    score = None
    ai_feedback = None
