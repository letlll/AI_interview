#!/usr/bin/env python
"""
测试 Redis 读写
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.core.cache import cache

def test_redis_readwrite():
    """测试 Redis 读写"""
    print("=" * 50)
    print("Redis 读写测试")
    print("=" * 50)
    print()
    
    test_email = "test@example.com"
    test_code = "123456"
    cache_key = f"email_code_{test_email}"
    
    print(f"测试邮箱: {test_email}")
    print(f"测试验证码: {test_code}")
    print(f"Redis Key: {cache_key}")
    print()
    
    # 1. 写入
    print("步骤 1：写入验证码到 Redis...")
    cache.set(cache_key, test_code, timeout=300)
    print("✓ 写入完成")
    print()
    
    # 2. 立即读取
    print("步骤 2：立即读取验证码...")
    stored_code = cache.get(cache_key)
    print(f"读取结果: {stored_code}")
    
    if stored_code == test_code:
        print("✓ 读取成功，值匹配")
    elif stored_code is None:
        print("✗ 读取失败，返回 None")
    else:
        print(f"✗ 读取失败，值不匹配：期望 {test_code}，实际 {stored_code}")
    
    print()
    
    # 3. 测试不同的 key
    print("步骤 3：测试不同的邮箱...")
    test_email2 = "letl41111@qq.com"
    cache_key2 = f"email_code_{test_email2}"
    
    print(f"测试邮箱 2: {test_email2}")
    print(f"Redis Key 2: {cache_key2}")
    
    cache.set(cache_key2, "654321", timeout=300)
    stored_code2 = cache.get(cache_key2)
    
    print(f"写入: 654321")
    print(f"读取: {stored_code2}")
    
    if stored_code2 == "654321":
        print("✓ 第二个 key 读写正常")
    else:
        print("✗ 第二个 key 读写失败")
    
    print()
    print("=" * 50)
    print("测试完成")
    print("=" * 50)

if __name__ == '__main__':
    test_redis_readwrite()
