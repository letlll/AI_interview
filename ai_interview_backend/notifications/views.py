from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import ActivityLog
from .serializers import ActivityLogSerializer, ActivityLogCreateSerializer


class ActivityLogViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActivityLogSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = ActivityLog.objects.filter(user=self.request.user)
        resource_type = self.request.query_params.get('resource_type')
        if resource_type in ('interview', 'resume', 'report'):
            qs = qs.filter(resource_type=resource_type)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request, *args, **kwargs):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, *args, **kwargs):
        try:
            log = self.get_queryset().get(pk=kwargs['pk'])
            log.is_read = True
            log.save(update_fields=['is_read'])
        except ActivityLog.DoesNotExist:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='log')
    def create_log(self, request, *args, **kwargs):
        serializer = ActivityLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        ActivityLog.objects.create(
            user=request.user,
            action_type=data['action_type'],
            action_status=data.get('action_status', 'success'),
            resource_type=data['resource_type'],
            resource_id=str(data['resource_id']),
            action_data=data.get('action_data', {}),
        )
        return Response(status=status.HTTP_201_CREATED)
