from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ActivityLogViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')

urlpatterns = router.urls