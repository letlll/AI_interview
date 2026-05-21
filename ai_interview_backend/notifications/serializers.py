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
