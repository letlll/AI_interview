from django.db import models
from django.conf import settings
class ActivityLog(models.Model):
    class ActionType(models.TextChoices):
        INTERVIEW_STARTED = 'interview_started', '面试开始'
        INTERVIEW_COMPLETED = 'interview_completed', '面试完成'
        INTERVIEW_ABORTED = 'interview_aborted', '面试异常退出'
        RESUME_EXPORTED = 'resume_exported', '简历导出'
        RESUME_DIAGNOSED = 'resume_diagnosed', '简历诊断'
        RESUME_GENERATED = 'resume_generated', '简历生成'
        RESUME_SAVED = 'resume_saved', '简历发布'
        REPORT_GENERATED = 'report_generated', '报告生成'

    class ActionStatus(models.TextChoices):
        SUCCESS = 'success', '成功'
        WARNING = 'warning', '警告'
        ERROR = 'error', '错误'

    class ResourceType(models.TextChoices):
        INTERVIEW = 'interview', '面试'
        RESUME = 'resume', '简历'
        REPORT = 'report', '报告'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_logs', verbose_name="用户")
    action_type = models.CharField(max_length=50, choices=ActionType.choices, verbose_name="操作类型")
    action_status = models.CharField(max_length=20, choices=ActionStatus.choices, default=ActionStatus.SUCCESS, verbose_name="操作状态")
    action_data = models.JSONField(default=dict, blank=True, verbose_name="操作数据")
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices, verbose_name="资源类型")
    resource_id = models.CharField(max_length=255, default='', blank=True, verbose_name="资源ID")
    is_read = models.BooleanField(default=False, db_index=True, verbose_name="是否已读")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="时间")

    class Meta:
        verbose_name = "操作日志"
        verbose_name_plural = verbose_name
        ordering = ['-timestamp']

    def __str__(self):
        return f"操作日志: {self.get_action_type_display()} ({self.user})"

