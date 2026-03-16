#!/usr/bin/env python
"""
测试注册序列化器
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.core.cache import cache
from users.serializers import UserRegisterSerializer
from users.models import User
import time

def test_serializer():
    """测试注册序列化器"""
    print("=" * 50)
    print("注册序列化器测试")
    print("=" * 50)
    print()
    
    # 使用唯一的邮箱和用户名
    test_email = f"test{int(time.time())}@example.com"
    test_username = f"testuser{int(time.time())}"
    test_code = "123456"
    
    # 1. 设置验证码到 Redis
    print("步骤 1：设置验证码到 Redis...")
    cache_key = f"email_code_{test_email}"
    cache.set(cache_key, test_code, timeout=300)
    cached = cache.get(cache_key)
    print(f"✓ 验证码已设置：{test_code}")
    print(f"✓ 验证码已验证：{cached}")
    print()
    
    # 2. 测试序列化器
    print("步骤 2：测试序列化器...")
    data = {
        'username': test_username,
        'email': test_email,
        'password': 'testpass123',
        'code': test_code,
    }
    print(f"输入数据：{data}")
    print()
    
    serializer = UserRegisterSerializer(data=data)
    
    if serializer.is_valid():
        print("✓ 数据验证通过")
        print()
        
        print("步骤 3：创建用户...")
        try:
            user = serializer.save()
            print(f"✓ 用户创建成功：{user.username} ({user.email})")
            print(f"✓ 用户 ID：{user.id}")
            print()
            
            # 验证用户是否在数据库中
            db_user = User.objects.get(email=test_email)
            print(f"✓ 数据库验证成功：{db_user.username}")
            print()
            
            print("=" * 50)
            print("✓ 所有测试通过！")
            print("=" * 50)
            return True
            
        except Exception as e:
            print(f"✗ 创建用户失败：{e}")
            import traceback
            traceback.print_exc()
            return False
    else:
        print("✗ 数据验证失败")
        print(f"错误：{serializer.errors}")
        print()
        return False

if __name__ == '__main__':
    success = test_serializer()
    sys.exit(0 if success else 1)
