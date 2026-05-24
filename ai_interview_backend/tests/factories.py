"""
全局共享 Factory 定义。

跨多个 app 使用的模型（User, AIModel, Industry, JobPosition）放在此处。
各 app 特有的 Factory 放在 `app/tests/factories.py`。
"""
import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """User 模型工厂——所有测试模块共享。"""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n:03d}@example.com')
    username = factory.Sequence(lambda n: f'testuser{n:03d}')
    password = factory.PostGenerationMethodCall('set_password', 'TestPass123!')
    role = User.Role.CANDIDATE
    status = User.Status.NORMAL
    is_active = True
    phone = factory.Sequence(lambda n: f'1380000{n:04d}')

    class Params:
        """预设快捷参数。"""
        admin = factory.Trait(
            role=User.Role.ADMIN,
            email=factory.Sequence(lambda n: f'admin{n:03d}@example.com'),
            username=factory.Sequence(lambda n: f'admin{n:03d}'),
        )
        hr = factory.Trait(
            role=User.Role.HR,
            email=factory.Sequence(lambda n: f'hr{n:03d}@example.com'),
            username=factory.Sequence(lambda n: f'hruser{n:03d}'),
        )


class AIModelFactory(factory.django.DjangoModelFactory):
    """AI 模型工厂。"""

    class Meta:
        model = 'system.AIModel'

    name = 'DeepSeek V4'
    model_slug = 'deepseek-chat'
    base_url = 'https://api.deepseek.com/v1'
    description = 'DeepSeek 大语言模型（测试用）'
    is_active = True
    supports_json_mode = True


class IndustryFactory(factory.django.DjangoModelFactory):
    """行业分类工厂。"""

    class Meta:
        model = 'system.Industry'

    name = factory.Sequence(lambda n: f'行业{n:02d}')
    description = factory.LazyAttribute(lambda o: f'{o.name}的描述')
    order = factory.Sequence(lambda n: n)
    is_active = True


class JobPositionFactory(factory.django.DjangoModelFactory):
    """面试岗位工厂。"""

    class Meta:
        model = 'system.JobPosition'

    industry = factory.SubFactory(IndustryFactory)
    name = factory.Sequence(lambda n: f'岗位{n:02d}')
    description = factory.LazyAttribute(lambda o: f'{o.name}的岗位描述')
    is_active = True
    order = factory.Sequence(lambda n: n)
