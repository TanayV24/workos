from django.urls import path
from .views import (
    TaskListView,
    TaskCreateView,
    TaskIntegrationSettingsGetView,
    TaskIntegrationSettingsUpdateView,
)

urlpatterns = [
    path('', TaskListView.as_view(), name='task-list'),
    path('create/', TaskCreateView.as_view(), name='task-create'),
    path('settings/get/', TaskIntegrationSettingsGetView.as_view(), name='task-settings-get'),
    path('settings/update/', TaskIntegrationSettingsUpdateView.as_view(), name='task-settings-update'),
]
