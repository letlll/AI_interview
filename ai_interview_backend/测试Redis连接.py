#!/usr/bin/env python
"""
测试 Redis 连接的辅助脚本
"""
import os
import sys
import django

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_interview_backend.settings')
django.setup()

from django.core.cache import cache
from django.conf import settings

def test_redis_connection():
    """测试 Redis 连接"""
    print("=" * 50)
    print("Redis 连接测试")
    print("=" * 50)
    print()
    
    # 显示配置信息
    redis_config = settings.CACHES['default']
    print(f"Redis 配置：")
    print(f"  地址：{redis_config['LOCATION']}")
    print(f"  后端：{redis_config['BACKEND']}")
    print()
    
    try:
        # 测试写入
        print("测试 1：写入数据...")
        cache.set('test_key', 'Hello Redis!', timeout=60)
        print("✓ 写入成功")
        print()
        
        # 测试读取
        print("测试 2：读取数据...")
        value = cache.get('test_key')
        if value == 'Hello Redis!':
            print(f"✓ 读取成功：{value}")
        else:
            print(f"✗ 读取失败：期望 'Hello Redis!'，实际得到 '{value}'")
        print()
        
        # 测试删除
        print("测试 3：删除数据...")
        cache.delete('test_key')
        value = cache.get('test_key')
        if value is None:
            print("✓ 删除成功")
        else:
            print(f"✗ 删除失败：数据仍然存在 '{value}'")
        print()
        
        print("=" * 50)
        print("✓ Redis 连接正常！")
        print("=" * 50)
        return True
        
    except Exception as e:
        print()
        print("=" * 50)
        print("✗ Redis 连接失败！")
        print("=" * 50)
        print()
        print(f"错误信息：{str(e)}")
        print()
        print("可能的原因：")
        print("  1. Redis 服务未启动")
        print("  2. Redis 端口配置错误")
        print("  3. Redis 连接被防火墙阻止")
        print()
        print("解决方案：")
        print("  1. 启动 Redis：redis-server")
        print("  2. 检查 .env 文件中的 REDIS_HOST 和 REDIS_PORT")
        print("  3. 确保 Redis 监听 localhost:6379")
        print()
        return False

if __name__ == '__main__':
    success = test_redis_connection()
    sys.exit(0 if success else 1)
