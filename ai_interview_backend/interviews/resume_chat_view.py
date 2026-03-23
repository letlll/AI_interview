# ai_interview_backend/interviews/resume_chat_view.py
"""
AI 对话式简历生成视图
支持增量更新和上下文理解
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .ai_services import generate_resume_chat_response
import logging

logger = logging.getLogger(__name__)


class GenerateResumeChatView(APIView):
    """
    AI 对话式简历生成接口
    
    接收用户消息、当前简历数据、聊天历史等上下文
    返回增量更新指令和反馈消息
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            # 获取请求数据
            user_message = request.data.get('user_message', '')
            current_resume = request.data.get('current_resume', {})
            chat_history = request.data.get('chat_history', [])
            last_edited_field = request.data.get('last_edited_field')

            # 验证必填字段
            if not user_message:
                return Response({
                    'error': '用户消息不能为空'
                }, status=status.HTTP_400_BAD_REQUEST)

            optimized_prompt = request.data.get('optimized_prompt')

            # 记录请求日志
            logger.info(f"用户 {request.user.username} 发起简历对话: {user_message[:50]}...")

            # 调用 AI 服务生成响应
            response_data = generate_resume_chat_response(
                user_message=user_message,
                current_resume=current_resume,
                chat_history=chat_history,
                last_edited_field=last_edited_field,
                user=request.user,
                optimized_prompt=optimized_prompt
            )

            # 检查是否有错误
            if 'error' in response_data:
                logger.error(f"AI 生成失败: {response_data['error']}")
                return Response(
                    response_data,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # 返回成功响应
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"简历对话生成异常: {str(e)}")
            return Response({
                'error': f'服务器内部错误: {str(e)}',
                'instructions': [],
                'message': '抱歉，AI 服务暂时不可用，请稍后重试。'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
