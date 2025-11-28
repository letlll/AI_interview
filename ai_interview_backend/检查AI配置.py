#!/usr/bin/env python
"""
检查当前用户的 AI 配置
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from system.models import AIModel, AISetting
from users.models import User

def check_ai_config():
    """检查 AI 配置"""
    print("=" * 60)
    print("AI 配置检查")
    print("=" * 60)
    print()
    
    # 1. 检查 AI 模型
    print("1. AI 模型列表")
    print("-" * 60)
    models = AIModel.objects.all()
    if models.exists():
        for model in models:
            status = "✓ 启用" if model.is_active else "✗ 禁用"
            print(f"  {status} {model.name}")
            print(f"     - Slug: {model.model_slug}")
            print(f"     - Base URL: {model.base_url}")
            print(f"     - 支持 JSON: {'是' if model.supports_json_mode else '否'}")
            print()
    else:
        print("  ⚠️  没有配置任何 AI 模型")
        print()
    
    # 2. 检查用户 AI 设置
    print("2. 用户 AI 设置")
    print("-" * 60)
    users = User.objects.all()
    for user in users:
        print(f"  用户: {user.username}")
        try:
            setting = user.ai_setting
            if setting.ai_model:
                print(f"    ✓ 默认模型: {setting.ai_model.name}")
            else:
                print(f"    ✗ 未设置默认模型")
            
            if setting.api_keys:
                print(f"    ✓ API Keys: {len(setting.api_keys)} 个")
                for model_id, key in setting.api_keys.items():
                    try:
                        model = AIModel.objects.get(id=int(model_id))
                        masked_key = key[:10] + "..." + key[-4:] if len(key) > 14 else "***"
                        print(f"       - {model.name}: {masked_key}")
                    except AIModel.DoesNotExist:
                        print(f"       - 模型ID {model_id}: (模型不存在)")
            else:
                print(f"    ✗ 未配置 API Keys")
        except AISetting.DoesNotExist:
            print(f"    ✗ 没有 AI 设置")
        print()
    
    # 3. 测试 AI 配置获取
    print("3. 测试 AI 配置获取")
    print("-" * 60)
    from interviews.ai_services import _get_user_ai_config
    
    for user in users:
        print(f"  测试用户: {user.username}")
        api_key, model = _get_user_ai_config(user)
        if api_key and model:
            masked_key = api_key[:10] + "..." + api_key[-4:] if len(api_key) > 14 else "***"
            print(f"    ✓ API Key: {masked_key}")
            print(f"    ✓ 模型: {model.name} ({model.model_slug})")
        else:
            print(f"    ✗ 无法获取 AI 配置")
            if not api_key:
                print(f"       - 缺少 API Key")
            if not model:
                print(f"       - 缺少模型")
        print()
    
    print("=" * 60)
    print("检查完成")
    print("=" * 60)

if __name__ == '__main__':
    check_ai_config()
