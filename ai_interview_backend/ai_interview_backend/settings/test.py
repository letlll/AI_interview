"""
Django test settings for AI Interview Backend.

Usage:
    python manage.py test --settings=ai_interview_backend.settings.test
"""
import os
from pathlib import Path

# .env 由 ai_interview_backend.settings.__init__ 加载，此处不重复
from ai_interview_backend.settings import *  # noqa: E402, F403

# ── 测试数据库：使用独立的 test 库，不影响开发/生产数据 ──
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('TEST_DB_NAME', 'ainterview_test'),
        'USER': os.getenv('DB_USER', 'root'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
        'TEST': {
            'NAME': os.getenv('TEST_DB_NAME', 'ainterview_test'),
        },
    }
}

# ── 缓存用本地内存（测试无需 Redis） ──
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# ── Celery 同步执行（避免异步等待，测试可直取结果） ──
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ── 快速密码哈希（加速 User 创建） ──
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# ── 文件存储用内存（避免上传测试写磁盘） ──
DEFAULT_FILE_STORAGE = 'django.core.files.storage.InMemoryStorage'

# ── Channels 测试用内存 layer，避免依赖 Redis ──
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# ── 禁用节流，测试不触发频率限制 ──
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {},
}

# ── 禁用 CORS 校验 ──
CORS_ALLOW_ALL_ORIGINS = True

# ── 静默日志 ──
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
}
