from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'action_type', 'action_status', 'action_data',
            'resource_type', 'resource_id', 'is_read', 'timestamp',
        ]
        read_only_fields = fields


class ActivityLogCreateSerializer(serializers.Serializer):
    action_type = serializers.ChoiceField(choices=['resume_exported', 'resume_generated'])
    action_status = serializers.ChoiceField(choices=['success', 'warning', 'error'], default='success')
    resource_type = serializers.ChoiceField(choices=['resume'])
    resource_id = serializers.CharField()
    action_data = serializers.JSONField(default=dict)
