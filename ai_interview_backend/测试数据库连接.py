#!/usr/bin/env python
"""
测试数据库连接
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.db import connection

def test_database_connection():
    """测试数据库连接"""
    print("=" * 50)
    print("数据库连接测试")
    print("=" * 50)
    print()
    
    try:
        # 尝试执行一个简单的查询
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
        print("✓ 数据库连接成功！")
        print(f"✓ 测试查询结果：{result}")
        print()
        
        # 显示数据库信息
        print("数据库配置：")
        print(f"  引擎：{connection.settings_dict['ENGINE']}")
        print(f"  数据库名：{connection.settings_dict['NAME']}")
        print(f"  主机：{connection.settings_dict['HOST']}")
        print(f"  端口：{connection.settings_dict['PORT']}")
        print(f"  用户：{connection.settings_dict['USER']}")
        print()
        
        print("=" * 50)
        print("✓ 数据库功能正常！")
        print("=" * 50)
        return True
        
    except Exception as e:
        print("=" * 50)
        print("✗ 数据库连接失败！")
        print("=" * 50)
        print()
        print(f"错误信息：{str(e)}")
        print()
        print("可能的原因：")
        print("  1. MySQL 服务未启动")
        print("  2. 数据库配置错误")
        print("  3. 数据库不存在")
        print("  4. 用户权限不足")
        print()
        return False

if __name__ == '__main__':
    success = test_database_connection()
    sys.exit(0 if success else 1)
