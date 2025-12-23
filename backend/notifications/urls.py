from django.urls import path
from notifications.views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationUnreadCountView,
    NotificationByTypeView,
    NotificationUnreadView,
)

urlpatterns = [
    # Notification endpoints
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread/', NotificationUnreadView.as_view(), name='notification-unread'),
    path('unread_count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('by_type/', NotificationByTypeView.as_view(), name='notification-by-type'),
    path('<uuid:pk>/mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('<uuid:pk>/', NotificationDeleteView.as_view(), name='notification-delete'),
]