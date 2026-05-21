from django.contrib import admin
from .models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action_type', 'action_status', 'resource_type', 'resource_id', 'timestamp', 'is_read')
    list_filter = ('action_type', 'action_status', 'resource_type', 'is_read', 'timestamp')
    search_fields = ('user__username', 'resource_id')
    readonly_fields = ('timestamp',)
