# ai-interview-backend/chat/serializers.py (新建文件)

from rest_framework import serializers
from .models import Conversation, Message
from users.serializers import UserProfileSerializer  # 复用已有的用户序列化器


class MessageSerializer(serializers.ModelSerializer):
    """序列化单条消息"""
    sender = UserProfileSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'message_type', 'file_url', 'timestamp', 'is_read', 'metadata']
        read_only_fields = ['id', 'sender', 'timestamp']


class ConversationSerializer(serializers.ModelSerializer):
    """序列化对话列表"""
    # 'participants' 默认只返回用户ID，我们需要自定义它
    participants = UserProfileSerializer(many=True, read_only=True)
    # 添加最新一条消息和未读消息数
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    resume_id = serializers.IntegerField(source='resume.id', read_only=True, allow_null=True)
    resume_title = serializers.CharField(source='resume.title', read_only=True, allow_null=True)
    # 返回完整简历对象供前端加载
    resume = serializers.SerializerMethodField()
    conversation_type_display = serializers.CharField(source='get_conversation_type_display', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'conversation_type', 'conversation_type_display',
            'resume_id', 'resume_title', 'resume', 'updated_at', 'latest_message', 'unread_count'
        ]

    def get_resume(self, obj):
        """返回关联简历的完整数据"""
        if obj.resume:
            return {
                'id': obj.resume.id,
                'title': obj.resume.title,
                'content_json': obj.resume.content_json,
                'template_name': getattr(obj.resume, 'template_name', 'classic'),
            }
        return None

    def get_latest_message(self, obj):
        """获取该对话的最新一条消息"""
        latest = obj.messages.order_by('-timestamp').first()
        if latest:
            # 复用 MessageSerializer 来序列化
            return MessageSerializer(latest).data
        return None

    def get_unread_count(self, obj):
        """获取当前用户在该对话中的未读消息数"""
        # `self.context['request'].user` 可以获取到当前请求的用户
        user = self.context['request'].user
        if user.is_authenticated:
            # 计算由对方发送且当前用户未读的消息数量
            return obj.messages.filter(is_read=False).exclude(sender=user).count()
        return 0


class ConversationDetailSerializer(ConversationSerializer):
    """对话详情序列化器，包含消息历史"""
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages', 'created_at']


class CreateMessageSerializer(serializers.Serializer):
    """创建消息的输入序列化器"""
    content = serializers.CharField(required=True, allow_blank=False)
    message_type = serializers.ChoiceField(
        choices=Message.MessageType.choices,
        default=Message.MessageType.TEXT
    )
    metadata = serializers.JSONField(required=False, default=dict)