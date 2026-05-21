from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


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


class Notification(models.Model):
    class VerbChoices(models.TextChoices):
        COMMENTED = 'commented', '评论了你的文章'
        REPLIED = 'replied', '回复了你的评论'
        LIKED_POST = 'liked_post', '点赞了你的文章'
        BOOKMARKED_POST = 'bookmarked_post', '收藏了你的文章'
        FOLLOWED = 'followed', '关注了你'
        MENTIONED = 'mentioned', '在评论中提到了你'
        NEW_POST_FROM_FOLLOWED = 'new_post', '发布了新文章'
        INTERVIEW_REPORT_READY = 'interview_report_ready', '面试报告已生成'
        RESUME_ANALYSIS_READY = 'resume_analysis_ready', '简历分析报告已生成'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications',
                                  verbose_name="接收者")
    is_read = models.BooleanField(default=False, db_index=True, verbose_name="是否已读")
    verb = models.CharField(max_length=50, choices=VerbChoices.choices, verbose_name="通知类型")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    actor_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='notification_actors')
    actor_object_id = models.CharField(max_length=255)
    actor = GenericForeignKey('actor_content_type', 'actor_object_id')

    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True,
                                            related_name='notification_targets')
    target_object_id = models.CharField(max_length=255, null=True, blank=True)
    target = GenericForeignKey('target_content_type', 'target_object_id')

    action_object_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True,
                                                   related_name='notification_action_objects')
    action_object_object_id = models.CharField(max_length=255, null=True, blank=True)
    action_object = GenericForeignKey('action_object_content_type', 'action_object_object_id')

    class Meta:
        verbose_name = "通知"
        verbose_name_plural = verbose_name
        ordering = ['-timestamp']

    def __str__(self):
        # 修复了 __str__ 方法中对 username 的不安全访问
        actor_name = getattr(self.actor, 'username', str(self.actor))
        recipient_name = getattr(self.recipient, 'username', str(self.recipient))
        return f"通知: {actor_name} {self.verb} -> {recipient_name}"