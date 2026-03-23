# ai-interview-backend/chat/models.py

from django.db import models
from django.conf import settings


class ConversationManager(models.Manager):
    def get_or_create_conversation(self, user1, user2):
        # 使用 annotate 和 filter 来高效地查找包含两个用户的对话
        qs = self.get_queryset().annotate(num_participants=models.Count('participants')) \
            .filter(participants=user1).filter(participants=user2).filter(num_participants=2)
        if qs.exists():
            return qs.first(), False
        else:
            conv = self.create()
            conv.participants.add(user1, user2)
            return conv, True

    def get_or_create_ai_conversation(self, user, resume=None):
        """获取或创建用户与 AI 的简历对话会话

        逻辑：
        1. 如果传入了 resume：优先查找绑定该简历的会话，如果没有则创建新会话
        2. 如果没有传入 resume 且 force_new 为 True：创建新会话
        3. 如果没有传入 resume：查找任意 AI 会话（兼容旧逻辑）
        """
        from resumes.models import Resume
        kwargs = {
            'conversation_type': self.model.ConversationType.USER_AI,
        }

        if resume:
            # 传入 resume 时：查找绑定该简历的会话，如果没有则创建新会话
            qs = self.get_queryset().filter(**kwargs).filter(participants=user).filter(resume=resume)
            conv = qs.first()
            if conv:
                return conv, False
            # 没有找到绑定该简历的会话，创建新会话
            conv = self.create(
                conversation_type=self.model.ConversationType.USER_AI,
                resume=resume
            )
            conv.participants.set([user])
            return conv, True
        else:
            # 没有传入 resume：查找任意 AI 会话（兼容旧逻辑）
            qs = self.get_queryset().filter(**kwargs).filter(participants=user)
            conv = qs.first()
            if conv:
                return conv, False
            # 创建无简历的会话
            conv = self.create(
                conversation_type=self.model.ConversationType.USER_AI,
                resume=None
            )
            conv.participants.set([user])
            return conv, True


class Conversation(models.Model):
    """代表两个用户之间的一次对话，或用户与 AI 的一次简历对话"""

    class ConversationType(models.TextChoices):
        USER_USER = 'user_user', '用户聊天'
        USER_AI = 'user_ai', 'AI 简历对话'

    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    conversation_type = models.CharField(
        max_length=20,
        choices=ConversationType.choices,
        default=ConversationType.USER_USER,
        db_index=True
    )
    resume = models.ForeignKey(
        'resumes.Resume',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_conversations',
        help_text='关联的简历（仅 AI 简历对话时使用）'
    )
    objects = ConversationManager()  # 添加管理器
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def is_ai_conversation(self):
        return self.conversation_type == self.ConversationType.USER_AI


class Message(models.Model):
    """代表对话中的一条消息，支持富媒体"""

    class MessageType(models.TextChoices):
        TEXT = 'text', '文本'
        IMAGE = 'image', '图片'
        FILE = 'file', '文件'
        VOICE = 'voice', '语音'
        VIDEO = 'video', '视频'
        AI_INSTRUCTION = 'ai_instruction', 'AI 更新指令'

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')

    # 核心字段
    content = models.TextField(blank=True, help_text="文本或表情包内容")
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.TEXT)
    file_url = models.URLField(max_length=512, blank=True, null=True, help_text="富媒体文件的URL")

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)

    # AI 对话额外字段
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='存储 AI 对话的额外信息（如 instructions、intent、resume_snapshot 等）'
    )

    class Meta:
        ordering = ['timestamp']