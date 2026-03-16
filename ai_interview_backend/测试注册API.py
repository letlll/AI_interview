#!/usr/bin/env python
"""
测试注册 API
"""
import os
import sys
import django
import json

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.test import Client
from django.core.cache import cache
from users.models import User

def test_register_api():
    """测试注册 API"""
    print("=" * 50)
    print("注册 API 测试")
    print("=" * 50)
    print()
    
    client = Client()
    
    # 测试邮箱 - 使用唯一的邮箱避免重复
    import time
    test_email = f"test{int(time.time())}@example.com"
    test_username = f"testuser{int(time.time())}"
    test_code = "123456"
    
    # 1. 先设置验证码到 Redis
    print("步骤 1：设置验证码到 Redis...")
    cache_key = f"email_code_{test_email}"
    cache.set(cache_key, test_code, timeout=300)
    cached = cache.get(cache_key)
    print(f"✓ 验证码已设置：{test_code}")
    print(f"✓ 验证码已验证：{cached}")
    print()
    
    # 2. 测试注册
    print("步骤 2：发送注册请求...")
    register_data = {
        'username': test_username,
        'email': test_email,
        'password': 'testpass123',
        'code': test_code,
    }
    print(f"请求数据：{json.dumps(register_data, indent=2, ensure_ascii=False)}")
    print()
    
    response = client.post(
        '/api/v1/auth/register/',
        data=json.dumps(register_data),
        content_type='application/json'
    )
    
    print(f"响应状态码：{response.status_code}")
    print(f"响应头：{dict(response.headers)}")
    print(f"响应内容：{response.content.decode('utf-8')}")
    print()
    
    if response.status_code == 201:
        print("=" * 50)
        print("✓ 注册成功！")
        print("=" * 50)
        
        # 验证用户是否创建
        try:
            user = User.objects.get(email=test_email)
            print(f"✓ 用户已创建：{user.username} ({user.email})")
        except User.DoesNotExist:
            print("✗ 用户未在数据库中找到")
        
        return True
    else:
        print("=" * 50)
        print("✗ 注册失败！")
        print("=" * 50)
        
        # 尝试解析错误信息
        try:
            error_data = json.loads(response.content.decode('utf-8'))
            print()
            print("错误详情：")
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"无法解析错误信息：{e}")
        
        return False

if __name__ == '__main__':
    success = test_register_api()
    sys.exit(0 if success else 1)
