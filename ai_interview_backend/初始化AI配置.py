#!/usr/bin/env python
"""
初始化 AI 模型和系统配置的辅助脚本
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from system.models import AIModel, AISetting
from django.conf import settings

def init_ai_config():
    """初始化 AI 配置"""
    print("=" * 60)
    print("初始化 AI 配置")
    print("=" * 60)
    print()
    
    # 从环境变量获取 API Key
    deepseek_api_key = os.getenv('DEEPSEEK_API_KEY')
    if not deepseek_api_key or deepseek_api_key.startswith('<'):
        print("⚠️  警告：未配置 DEEPSEEK_API_KEY")
        print("   请在 .env 文件中设置 DEEPSEEK_API_KEY")
        print()
    
    # 1. 创建 AI 模型
    print("步骤 1：创建 AI 模型")
    print("-" * 60)
    
    models_to_create = [
        {
            'name': 'DeepSeek Chat',
            'model_slug': 'deepseek-chat',
            'base_url': 'https://api.deepseek.com/v1',
            'is_active': True,
            'supports_json_mode': True,
            'description': 'DeepSeek 对话模型，适用于一般对话和文本生成'
        },
        {
            'name': 'DeepSeek Reasoner',
            'model_slug': 'deepseek-reasoner',
            'base_url': 'https://api.deepseek.com/v1',
            'is_active': True,
            'supports_json_mode': True,
            'description': 'DeepSeek 推理模型，适用于复杂推理任务'
        },
        {
            'name': 'OpenAI GPT-4',
            'model_slug': 'gpt-4',
            'base_url': 'https://api.openai.com/v1',
            'is_active': False,
            'supports_json_mode': True,
            'description': 'OpenAI GPT-4 模型（需要配置 API Key）'
        },
        {
            'name': 'OpenAI GPT-3.5 Turbo',
            'model_slug': 'gpt-3.5-turbo',
            'base_url': 'https://api.openai.com/v1',
            'is_active': False,
            'supports_json_mode': True,
            'description': 'OpenAI GPT-3.5 Turbo 模型（需要配置 API Key）'
        }
    ]
    
    created_models = {}
    for model_data in models_to_create:
        model, created = AIModel.objects.get_or_create(
            model_slug=model_data['model_slug'],
            defaults=model_data
        )
        if created:
            print(f"  ✓ 创建模型：{model.name} ({model.model_slug})")
        else:
            print(f"  - 模型已存在：{model.name} ({model.model_slug})")
            # 更新模型信息
            for key, value in model_data.items():
                setattr(model, key, value)
            model.save()
            print(f"    已更新模型信息")
        created_models[model.model_slug] = model
    
    print()
    
    # 2. 创建系统默认 AI 设置（为每个用户创建）
    print("步骤 2：为所有用户创建默认 AI 设置")
    print("-" * 60)
    
    # 获取 DeepSeek Chat 作为默认模型
    default_model = created_models.get('deepseek-chat')
    
    if not default_model:
        print("  ✗ 错误：未找到 DeepSeek Chat 模型")
        return
    
    # 为所有用户创建 AI 设置
    from users.models import User
    users = User.objects.all()
    
    for user in users:
        user_setting, created = AISetting.objects.get_or_create(
            user=user,
            defaults={
                'ai_model': default_model,
                'api_keys': {}
            }
        )
        
        if created:
            print(f"  ✓ 为用户 {user.username} 创建 AI 设置")
        else:
            print(f"  - 用户 {user.username} 的 AI 设置已存在")
            if not user_setting.ai_model:
                user_setting.ai_model = default_model
                user_setting.save()
                print(f"    已设置默认模型为：{default_model.name}")
        
        # 如果有系统 API Key，添加到用户设置中
        if deepseek_api_key and not deepseek_api_key.startswith('<'):
            model_id_str = str(default_model.id)
            if model_id_str not in user_setting.api_keys:
                user_setting.api_keys[model_id_str] = deepseek_api_key
                user_setting.save()
                print(f"    已添加 DeepSeek API Key")
    
    if users.count() == 0:
        print("  ⚠️  系统中还没有用户")
        print("     用户注册后会自动创建 AI 设置")
    
    print()
    print("=" * 60)
    print("✓ AI 配置初始化完成！")
    print("=" * 60)
    print()
    print("配置摘要：")
    print(f"  - 已配置 {AIModel.objects.count()} 个 AI 模型")
    print(f"  - 默认模型：{default_model.name}")
    print(f"  - 已配置用户数：{AISetting.objects.count()}")
    print()
    print("提示：")
    print("  1. 访问后台管理查看配置：http://localhost:8000/admin/")
    print("  2. 用户可以在前端设置页面配置自己的 AI 模型和 API Key")
    print("  3. 如需添加其他 AI 服务，请在后台管理中配置")
    print()

if __name__ == '__main__':
    try:
        init_ai_config()
    except Exception as e:
        print()
        print("=" * 60)
        print("✗ 初始化失败！")
        print("=" * 60)
        print()
        print(f"错误信息：{str(e)}")
        print()
        import traceback
        traceback.print_exc()
        sys.exit(1)
