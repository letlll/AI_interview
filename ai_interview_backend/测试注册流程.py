#!/usr/bin/env python
"""
测试注册流程的辅助脚本
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.core.cache import cache
from users.services import send_verification_code
from users.serializers import UserRegisterSerializer

def test_registration_flow():
    """测试完整的注册流程"""
    print("=" * 60)
    print("注册流程测试")
    print("=" * 60)
    print()
    
    test_email = "test@example.com"
    test_username = "testuser"
    test_password = "test123456"
    
    # 步骤 1：发送验证码
    print("步骤 1：发送验证码")
    print(f"  邮箱：{test_email}")
    success = send_verification_code(test_email)
    if success:
        print("  ✓ 验证码发送成功")
    else:
        print("  ✗ 验证码发送失败")
        return
    print()
    
    # 步骤 2：从 Redis 获取验证码
    print("步骤 2：从 Redis 获取验证码")
    cache_key = f"email_code_{test_email}"
    cached_code = cache.get(cache_key)
    if cached_code:
        print(f"  ✓ 验证码：{cached_code}")
    else:
        print("  ✗ 无法从 Redis 获取验证码")
        return
    print()
    
    # 步骤 3：模拟用户注册请求
    print("步骤 3：模拟用户注册")
    register_data = {
        'username': test_username,
        'email': test_email,
        'password': test_password,
        'code': cached_code
    }
    print(f"  注册数据：{register_data}")
    
    serializer = UserRegisterSerializer(data=register_data)
    if serializer.is_valid():
        print("  ✓ 数据验证通过")
        print()
        print("=" * 60)
        print("✓ 注册流程测试成功！")
        print("=" * 60)
        print()
        print("提示：这只是测试，没有真正创建用户")
    else:
        print("  ✗ 数据验证失败")
        print(f"  错误信息：{serializer.errors}")
        print()
        print("=" * 60)
        print("✗ 注册流程测试失败！")
        print("=" * 60)
    
    # 清理测试数据
    cache.delete(cache_key)
    print()
    print("已清理测试数据")

if __name__ == '__main__':
    test_registration_flow()
