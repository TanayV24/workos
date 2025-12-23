# FILE 7: backend/notifications/serializers.py

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'type_display',
            'title',
            'message',
            'related_task_id',
            'related_task_title',
            'read',
            'created_at',
            'read_at',
            'triggered_by'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'type_display']