from django.urls import path
from tasks.views import (
    TaskListView,
    TaskCreateView,
    TaskDetailView,
    TaskUpdateView,
    TaskCommentView,
    TaskIntegrationSettingsGetView,
    TaskIntegrationSettingsUpdateView,
)

urlpatterns = [
    # Task endpoints
    path('', TaskListView.as_view(), name='task-list'),
    path('create/', TaskCreateView.as_view(), name='task-create'),
    path('<uuid:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('update/<uuid:pk>/', TaskUpdateView.as_view(), name='task-update'),
    path('comment/', TaskCommentView.as_view(), name='task-comment'),
    
    # Integration settings endpoints
    path('settings/get/', TaskIntegrationSettingsGetView.as_view(), name='settings-get'),
    path('settings/update/', TaskIntegrationSettingsUpdateView.as_view(), name='settings-update'),
]