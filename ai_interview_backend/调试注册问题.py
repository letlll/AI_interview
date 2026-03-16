#!/usr/bin/env python
"""
调试注册问题 - 模拟真实的 HTTP 请求
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
import time

def debug_register():
    """调试注册流程"""
    print("=" * 70)
    print("调试注册问题")
    print("=" * 70)
    print()
    
    client = Client()
    
    # 使用唯一的邮箱和用户名
    test_email = f"debug{int(time.time())}@example.com"
    test_username = f"debuguser{int(time.time())}"
    test_code = "123456"
    
    # 步骤 1：发送验证码
    print("=" * 70)
    print("步骤 1：测试发送验证码 API")
    print("=" * 70)
    
    send_code_data = {"email": test_email}
    print(f"请求 URL: POST /api/v1/auth/send-code/")
    print(f"请求数据: {json.dumps(send_code_data, indent=2)}")
    print()
    
    response = client.post(
        '/api/v1/auth/send-code/',
        data=json.dumps(send_code_data),
        content_type='application/json'
    )
    
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.content.decode('utf-8')}")
    print()
    
    if response.status_code == 200:
        print("✓ 发送验证码成功")
    else:
        print("✗ 发送验证码失败")
        try:
            error = json.loads(response.content.decode('utf-8'))
            print(f"错误详情: {json.dumps(error, indent=2, ensure_ascii=False)}")
        except:
            pass
    
    print()
    
    # 手动设置验证码（以防邮件发送失败）
    cache_key = f"email_code_{test_email}"
    cache.set(cache_key, test_code, timeout=300)
    print(f"✓ 已手动设置验证码到 Redis: {test_code}")
    print()
    
    # 步骤 2：注册用户
    print("=" * 70)
    print("步骤 2：测试注册 API")
    print("=" * 70)
    
    register_data = {
        'username': test_username,
        'email': test_email,
        'password': 'testpass123',
        'code': test_code,
    }
    
    print(f"请求 URL: POST /api/v1/auth/register/")
    print(f"请求数据: {json.dumps(register_data, indent=2)}")
    print()
    
    # 尝试不同的请求方式
    print("尝试 1: 使用 JSON content-type")
    response = client.post(
        '/api/v1/auth/register/',
        data=json.dumps(register_data),
        content_type='application/json'
    )
    
    print(f"响应状态码: {response.status_code}")
    print(f"响应头: Content-Type = {response.get('Content-Type', 'N/A')}")
    
    # 检查响应内容
    response_content = response.content.decode('utf-8')
    print(f"响应长度: {len(response_content)} 字节")
    
    # 如果响应是 HTML（错误页面），只显示前 500 字符
    if response_content.startswith('<!DOCTYPE') or response_content.startswith('<html'):
        print("响应类型: HTML 错误页面")
        print("响应内容（前 500 字符）:")
        print(response_content[:500])
        print("...")
        
        # 尝试从 HTML 中提取错误信息
        if 'Exception Type:' in response_content:
            import re
            exception_match = re.search(r'Exception Type:\s*</th>\s*<td>(.*?)</td>', response_content)
            value_match = re.search(r'Exception Value:\s*</th>\s*<td><pre>(.*?)</pre>', response_content, re.DOTALL)
            
            if exception_match:
                print(f"\n异常类型: {exception_match.group(1)}")
            if value_match:
                print(f"异常值: {value_match.group(1)[:200]}")
    else:
        print("响应内容:")
        print(response_content)
    
    print()
    
    if response.status_code == 201:
        print("✓ 注册成功")
        try:
            user_data = json.loads(response_content)
            print(f"用户数据: {json.dumps(user_data, indent=2, ensure_ascii=False)}")
        except:
            pass
    else:
        print("✗ 注册失败")
        
        # 尝试解析错误
        if not response_content.startswith('<!DOCTYPE'):
            try:
                error = json.loads(response_content)
                print(f"错误详情: {json.dumps(error, indent=2, ensure_ascii=False)}")
            except:
                pass
    
    print()
    print("=" * 70)
    print("调试完成")
    print("=" * 70)

if __name__ == '__main__':
    debug_register()
