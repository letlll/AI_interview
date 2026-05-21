from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Like, Bookmark, Follow
from blog.models import Comment, Post


# --- Like Signals ---
@receiver(post_save, sender=Like)
def create_like_notification_and_update_count(sender, instance, created, **kwargs):
    if created:
        Post.objects.filter(id=instance.post.id).update(like_count=F('like_count') + 1)


@receiver(post_delete, sender=Like)
def update_like_count_on_delete(sender, instance, **kwargs):
    Post.objects.filter(id=instance.post.id).update(like_count=F('like_count') - 1)


# --- Bookmark Signals ---
@receiver(post_save, sender=Bookmark)
def create_bookmark_notification_and_update_count(sender, instance, created, **kwargs):
    if created:
        Post.objects.filter(id=instance.post.id).update(bookmark_count=F('bookmark_count') + 1)


@receiver(post_delete, sender=Bookmark)
def update_bookmark_count_on_delete(sender, instance, **kwargs):
    Post.objects.filter(id=instance.post.id).update(bookmark_count=F('bookmark_count') - 1)


# --- Follow Signals ---
@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    pass


# --- Comment Signals ---
@receiver(post_save, sender=Comment)
def create_comment_notification_and_update_count(sender, instance, created, **kwargs):
    if created:
        Post.objects.filter(id=instance.post.id).update(comment_count=F('comment_count') + 1)


@receiver(post_delete, sender=Comment)
def update_comment_count_on_delete(sender, instance, **kwargs):
    Post.objects.filter(id=instance.post.id).update(comment_count=F('comment_count') - 1)
