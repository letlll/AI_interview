""" resumes/tests/ 模块专用 Factory """
import factory
from resumes.models import Resume
from tests.factories import UserFactory


class ResumeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Resume

    user = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f'简历{n:03d}')
    full_name = '张三'
    phone = '13800001111'
    email = 'zhangsan@test.com'
    job_title = 'Python 开发工程师'
    city = '北京'
    summary = '3年Python后端开发经验'
    content_json = None
    template_name = 'default'
    status = Resume.Status.DRAFT
    parsed_content = ''
