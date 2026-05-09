#!/usr/bin/env python
"""
测试邮件发送功能
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    """测试邮件发送"""
    print("=" * 50)
    print("邮件发送测试")
    print("=" * 50)
    print()
    
    # 显示配置信息
    print(f"邮件配置：")
    print(f"  SMTP 服务器：{settings.EMAIL_HOST}")
    print(f"  SMTP 端口：{settings.EMAIL_PORT}")
    print(f"  发件人：{settings.DEFAULT_FROM_EMAIL}")
    print(f"  使用 TLS：{settings.EMAIL_USE_TLS}")
    print()
    
    try:
        print("正在发送测试邮件...")
        send_mail(
            subject='【AInterview】测试邮件',
            message='这是一封测试邮件，用于验证邮件发送功能是否正常。',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.EMAIL_HOST_USER],  # 发送给自己
            fail_silently=False,
        )
        print("✓ 邮件发送成功！")
        print()
        print("=" * 50)
        print("✓ 邮件功能正常！")
        print("=" * 50)
        return True
        
    except Exception as e:
        print()
        print("=" * 50)
        print("✗ 邮件发送失败！")
        print("=" * 50)
        print()
        print(f"错误信息：{str(e)}")
        print()
        print("可能的原因：")
        print("  1. SMTP 服务器配置错误")
        print("  2. 邮箱授权码不正确")
        print("  3. 网络连接问题")
        print("  4. SMTP 端口被防火墙阻止")
        print()
        print("解决方案：")
        print("  1. 检查 .env 文件中的邮件配置")
        print("  2. 确认 EMAIL_HOST_PASSWORD 是授权码而非邮箱密码")
        print("  3. 检查网络连接")
        print()
        return False

if __name__ == '__main__':
    success = test_email()
    sys.exit(0 if success else 1)
