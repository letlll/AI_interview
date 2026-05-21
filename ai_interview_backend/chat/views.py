# ai-interview-backend/chat/views.py (新建文件)
from django.shortcuts import get_object_or_404  # <-- 导入 get_object_or_404
from rest_framework.views import APIView  # <-- 导入 APIView
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer, MessageSerializer, ConversationDetailSerializer,
    CreateMessageSerializer
)
from users.models import User


# --- AI 简历对话视图 ---

class AIConversationView(APIView):
    """
    AI 简历对话会话管理
    - POST /api/v1/chat/ai/conversations/  创建或获取 AI 对话会话
    - GET /api/v1/chat/ai/conversations/  获取用户的所有 AI 对话会话
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """获取用户的所有 AI 对话会话"""
        conversations = Conversation.objects.filter(
            participants=request.user,
            conversation_type=Conversation.ConversationType.USER_AI
        ).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """创建或获取 AI 对话会话"""
        resume_id = request.data.get('resume_id')

        from resumes.models import Resume
        resume = None
        if resume_id:
            resume = get_object_or_404(Resume, id=resume_id, user=request.user)

        conversation, created = Conversation.objects.get_or_create_ai_conversation(
            user=request.user,
            resume=resume
        )

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AIMessageView(APIView):
    """
    AI 简历对话消息管理
    - GET /api/v1/chat/ai/conversations/{conversation_id}/messages/  获取消息历史
    - POST /api/v1/chat/ai/conversations/{conversation_id}/messages/  发送消息并获取 AI 回复
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, conversation_id, user):
        """获取用户有权访问的 AI 对话会话"""
        return get_object_or_404(
            Conversation,
            id=conversation_id,
            participants=user,
            conversation_type=Conversation.ConversationType.USER_AI
        )

    def get(self, request, conversation_id):
        """获取对话消息历史"""
        conversation = self.get_conversation(conversation_id, request.user)
        messages = conversation.messages.all().order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response({
            'conversation_id': conversation.id,
            'resume_id': conversation.resume.id if conversation.resume else None,
            'resume_content': conversation.resume.content_json if conversation.resume else None,
            'messages': serializer.data
        })

    def post(self, request, conversation_id):
        """发送消息并获取 AI 回复（复用现有 generate_resume_chat_response）"""
        from interviews.ai_services import generate_resume_chat_response

        conversation = self.get_conversation(conversation_id, request.user)

        user_message = request.data.get('content', '')
        if not user_message:
            return Response({'error': '消息内容不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        # 构建 chat_history（从数据库获取最近的消息）
        chat_history = conversation.messages.all().order_by('-timestamp')[:20]
        chat_history_list = [
            {
                'role': msg.sender_id == request.user.id and 'user' or 'assistant',
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat()
            }
            for msg in reversed(list(chat_history))
        ]

        # 获取当前简历数据
        current_resume = {}
        if conversation.resume and conversation.resume.content_json:
            current_resume = conversation.resume.content_json

        # 调用 AI 服务
        response_data = generate_resume_chat_response(
            user_message=user_message,
            current_resume=current_resume,
            chat_history=chat_history_list,
            last_edited_field=request.data.get('last_edited_field'),
            user=request.user,
            optimized_prompt=request.data.get('optimized_prompt')
        )

        # 保存用户消息
        user_msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=user_message,
            message_type=Message.MessageType.TEXT
        )

        # 保存 AI 回复
        ai_msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,  # AI 消息也关联到用户，后续可改为系统用户
            content=response_data.get('message', ''),
            message_type=Message.MessageType.TEXT,
            metadata={
                'instructions': response_data.get('instructions', []),
                'is_ai_response': True
            }
        )

        # 注意：简历更新由前端根据 instructions 自行处理
        # 前端收到 instructions 后，使用 useResumeAI.ts 中的 applyInstructions 函数更新简历

        return Response({
            'user_message': MessageSerializer(user_msg).data,
            'ai_response': MessageSerializer(ai_msg).data,
            'instructions': response_data.get('instructions', []),
            'message': response_data.get('message', ''),
            'updated_resume': conversation.resume.content_json if conversation.resume else current_resume
        })


# --- 用户聊天视图（原有功能）---

class StartConversationView(APIView):
    """
    根据用户ID获取或创建一个对话。
    POST /api/v1/conversations/start_with/<user_id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id, *args, **kwargs):
        # 1. 验证目标用户是否存在
        target_user = get_object_or_404(User, id=user_id)

        # 2. 验证不能和自己创建对话
        if request.user == target_user:
            return Response(
                {"error": "You cannot start a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. 使用我们之前创建的模型管理器方法来获取或创建对话
        conversation, created = Conversation.objects.get_or_create_conversation(request.user, target_user)

        # 4. 序列化对话数据并返回
        # 传递 context 是为了让 serializer 能访问到 request 对象，从而计算 unread_count
        serializer = ConversationSerializer(conversation, context={'request': request})

        # 根据是新建还是找到，返回不同的状态码
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK

        return Response(serializer.data, status=response_status)


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    一个只读的 ViewSet，用于获取对话列表。
    - GET /api/v1/conversations/
    不分页，一次性返回用户的所有对话。
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        """确保用户只能看到自己参与的对话"""
        return self.request.user.conversations.all().order_by('-updated_at')

class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    一个只读的 ViewSet，用于获取特定对话的历史消息。
    - GET /api/v1/conversations/{conversation_pk}/messages/
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        根据 URL 中的 conversation_pk，获取对应对话的消息。
        并确保当前用户是该对话的参与者之一。
        """
        conversation_pk = self.kwargs.get('conversation_pk')
        try:
            # 验证当前用户是否属于该对话
            conversation = self.request.user.conversations.get(pk=conversation_pk)
            return conversation.messages.all().order_by('-timestamp')
        except Conversation.DoesNotExist:
            # 如果不属于，返回一个空 queryset，DRF 会自动处理为 404 Not Found
            return Message.objects.none()