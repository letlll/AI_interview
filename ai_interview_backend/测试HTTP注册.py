#!/usr/bin/env python
"""
测试 HTTP 注册端点
需要 Django 服务器正在运行
"""
import requests
import json
import time

def test_http_register():
    """测试 HTTP 注册"""
    print("=" * 50)
    print("HTTP 注册测试")
    print("=" * 50)
    print()
    
    base_url = "http://localhost:8000/api/v1/auth"
    
    # 使用唯一的邮箱和用户名
    test_email = f"test{int(time.time())}@example.com"
    test_username = f"testuser{int(time.time())}"
    
    # 1. 发送验证码
    print("步骤 1：发送验证码...")
    try:
        response = requests.post(
            f"{base_url}/send-code/",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        print(f"状态码：{response.status_code}")
        print(f"响应：{response.text}")
        
        if response.status_code != 200:
            print("✗ 发送验证码失败")
            return False
        
        print("✓ 验证码已发送")
        print()
    except Exception as e:
        print(f"✗ 请求失败：{e}")
        print("请确保 Django 服务器正在运行（http://localhost:8000）")
        return False
    
    # 2. 注册用户（使用固定验证码进行测试）
    print("步骤 2：注册用户...")
    print("请输入收到的验证码（或按回车使用测试验证码）：")
    code = input().strip() or "123456"
    
    register_data = {
        'username': test_username,
        'email': test_email,
        'password': 'testpass123',
        'code': code,
    }
    
    print(f"注册数据：{json.dumps(register_data, indent=2)}")
    print()
    
    try:
        response = requests.post(
            f"{base_url}/register/",
            json=register_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"状态码：{response.status_code}")
        print(f"响应头：{dict(response.headers)}")
        print(f"响应：{response.text}")
        print()
        
        if response.status_code == 201:
            print("=" * 50)
            print("✓ 注册成功！")
            print("=" * 50)
            return True
        else:
            print("=" * 50)
            print("✗ 注册失败！")
            print("=" * 50)
            
            try:
                error_data = response.json()
                print()
                print("错误详情：")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                pass
            
            return False
            
    except Exception as e:
        print(f"✗ 请求失败：{e}")
        return False

if __name__ == '__main__':
    print("注意：此测试需要 Django 服务器正在运行")
    print("请先运行：启动Django服务器.bat")
    print()
    input("按回车继续...")
    print()
    
    success = test_http_register()
    
    print()
    input("按回车退出...")
