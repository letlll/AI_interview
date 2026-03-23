# resumes/signals.py

from django.db.models.signals import post_delete
from django.dispatch import receiver
from chat.models import Conversation


@receiver(post_delete, sender='resumes.Resume')
def delete_related_ai_conversations(sender, instance, **kwargs):
    """
    简历删除时，同步删除绑定的所有 AI 对话会话。
    Conversation 的 CASCADE 会自动删除关联的 Message 记录。
    """
    Conversation.objects.filter(resume=instance).delete()
