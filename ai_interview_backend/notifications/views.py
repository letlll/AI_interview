from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.db import models
from .models import Notification, ActivityLog
from .serializers import NotificationSerializer, ActivityLogSerializer

from interviews.models import InterviewSession
from resumes.models import Resume
from reports.models import ResumeAnalysisReport
from chat.models import Conversation


def build_activity_list(user, resource_type=None):
    """聚合多张业务表的数据，统一为 ActivityLog 样式的字典列表。"""
    items = []

    # --- 1. 面试会话 ---
    interviews = InterviewSession.objects.filter(user=user)
    if resource_type is None or resource_type == 'interview':
        for s in interviews:
            if s.status == 'running':
                action_type = 'interview_started'
                action_status = 'success'
            elif s.status == 'finished':
                action_type = 'interview_completed'
                action_status = 'success'
            elif s.status == 'canceled':
                action_type = 'interview_aborted'
                action_status = 'warning'
            else:
                continue  # skip pending

            items.append({
                'id': f'interview_{s.id}',
                'action_type': action_type,
                'action_status': action_status,
                'action_data': {
                    'job_position': s.job_position,
                    'score': s.report.get('total_score') if isinstance(s.report, dict) else None,
                    'total': s.question_count,
                    'answered': s.questions.filter(answer_text__gt='').count(),
                },
                'resource_type': 'interview',
                'resource_id': str(s.id),
                'is_read': False,
                'timestamp': (s.started_at or s.created_at).isoformat(),
            })

    # --- 2. 简历 ---
    resumes = Resume.objects.filter(user=user)
    if resource_type is None or resource_type == 'resume':
        for r in resumes:
            if r.status == 'published':
                action_type = 'resume_saved'
                action_status = 'success'
            elif r.status == 'parsed':
                action_type = 'resume_generated'
                action_status = 'success'
            elif r.status == 'draft':
                action_type = 'resume_generated'
                action_status = 'success'
            else:
                action_type = 'resume_generated'
                action_status = 'warning'

            items.append({
                'id': f'resume_{r.id}',
                'action_type': action_type,
                'action_status': action_status,
                'action_data': {
                    'template_name': r.template_name or r.title,
                    'method': '在线编辑',
                },
                'resource_type': 'resume',
                'resource_id': str(r.id),
                'is_read': False,
                'timestamp': r.updated_at.isoformat(),
            })

    # --- 3. 简历分析报告 ---
    if resource_type is None or resource_type == 'report':
        reports = ResumeAnalysisReport.objects.filter(user=user).select_related('resume')
        for rp in reports:
            items.append({
                'id': f'analysis_{rp.id}',
                'action_type': 'resume_diagnosed',
                'action_status': 'success',
                'action_data': {
                    'score': rp.overall_score,
                    'template_name': rp.resume.title if rp.resume else '',
                },
                'resource_type': 'report',
                'resource_id': str(rp.id),
                'is_read': False,
                'timestamp': rp.created_at.isoformat(),
            })

    # --- 4. 面试报告 ---
    if resource_type is None or resource_type == 'report':
        finished_interviews = InterviewSession.objects.filter(
            user=user, status='finished', report__isnull=False,
        )
        for s in finished_interviews:
            if isinstance(s.report, dict) and s.report:
                items.append({
                    'id': f'report_{s.id}',
                    'action_type': 'report_generated',
                    'action_status': 'success',
                    'action_data': {
                        'report_type': '面试',
                        'score': s.report.get('total_score'),
                        'job_position': s.job_position,
                    },
                    'resource_type': 'report',
                    'resource_id': str(s.id),
                    'is_read': False,
                    'timestamp': (s.finished_at or s.created_at).isoformat(),
                })

    # --- 4. AI 对话（简历生成） ---
    if resource_type is None or resource_type == 'resume':
        conversations = Conversation.objects.filter(
            participants=user,
            conversation_type='user_ai',
        ).order_by('-updated_at')
        for c in conversations:
            items.append({
                'id': f'chat_{c.id}',
                'action_type': 'resume_generated',
                'action_status': 'success',
                'action_data': {
                    'method': 'AI 对话生成',
                    'template_name': c.resume.title if c.resume else '简历',
                },
                'resource_type': 'resume',
                'resource_id': str(c.resume_id) if c.resume_id else '',
                'is_read': False,
                'timestamp': c.updated_at.isoformat(),
            })

    # 按时间倒序
    items.sort(key=lambda x: x['timestamp'], reverse=True)
    return items


class ActivityLogViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActivityLogSerializer

    def list(self, request, *args, **kwargs):
        resource_type = request.query_params.get('resource_type')
        page_num = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        all_items = build_activity_list(request.user, resource_type)
        paginator = Paginator(all_items, page_size)
        page = paginator.page(page_num)

        return Response({
            'count': paginator.count,
            'next': f'/api/v1/activity-logs/?page={page_num + 1}&page_size={page_size}' if page.has_next() else None,
            'previous': f'/api/v1/activity-logs/?page={page_num - 1}&page_size={page_size}' if page.has_previous() else None,
            'results': list(page.object_list),
        })

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request, *args, **kwargs):
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, *args, **kwargs):
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.all()

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request, *args, **kwargs):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
