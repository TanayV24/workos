# FILE 2: backend/tasks/serializers.py

from rest_framework import serializers
from .models import (
    Task,
    TaskComment,
    TaskChecklist,
    TaskAttachment,
    TaskIntegrationSettings
)


class TaskIntegrationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for Integration Page settings"""
    class Meta:
        model = TaskIntegrationSettings
        fields = [
            'id',
            'company_id',
            'allow_intra_department_assignments',
            'allow_employee_task_assignment',
            'allow_employee_task_creation',
            'allow_multi_task_assignment',
            'allow_timeline_priority_editing',
            'cross_department_task_redirection',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskChecklistSerializer(serializers.ModelSerializer):
    """Serializer for task checklist items"""
    class Meta:
        model = TaskChecklist
        fields = [
            'id',
            'task_id',
            'title',
            'description',
            'is_completed',
            'completed_by',
            'completed_at',
            'order_index'
        ]


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for task attachments"""
    class Meta:
        model = TaskAttachment
        fields = [
            'id',
            'task_id',
            'file_name',
            'file_url',
            'file_size',
            'file_type',
            'uploaded_by',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for task comments"""
    class Meta:
        model = TaskComment
        fields = [
            'id',
            'task_id',
            'content',
            'posted_by',
            'mentions',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskListSerializer(serializers.ModelSerializer):
    """Simplified serializer for task lists (Kanban, etc.)"""
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    def get_assigned_to_name(self, obj):
        """Get assignee name from users table"""
        from users.models import User
        try:
            user = User.objects.get(id=obj.assigned_to)
            return user.name
        except User.DoesNotExist:
            return "Unknown"
    
    def get_assigned_by_name(self, obj):
        """Get creator name from users table"""
        from users.models import User
        try:
            user = User.objects.get(id=obj.assigned_by)
            return user.name
        except User.DoesNotExist:
            return "Unknown"
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'assigned_to',
            'assigned_to_name',
            'assigned_by',
            'assigned_by_name',
            'due_date',
            'progress_percentage',
            'created_at',
            'tags'
        ]


class TaskDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single task view with related data"""
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True, source='taskcomment_set')
    checklist = TaskChecklistSerializer(many=True, read_only=True, source='taskchecklist_set')
    attachments = TaskAttachmentSerializer(many=True, read_only=True, source='taskattachment_set')
    
    def get_assigned_to_name(self, obj):
        from users.models import User
        try:
            user = User.objects.get(id=obj.assigned_to)
            return user.name
        except User.DoesNotExist:
            return "Unknown"
    
    def get_assigned_by_name(self, obj):
        from users.models import User
        try:
            user = User.objects.get(id=obj.assigned_by)
            return user.name
        except User.DoesNotExist:
            return "Unknown"
    
    class Meta:
        model = Task
        fields = [
            'id',
            'company_id',
            'title',
            'description',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'assigned_to',
            'assigned_to_name',
            'assigned_by',
            'assigned_by_name',
            'created_date',
            'start_date',
            'due_date',
            'completed_date',
            'estimated_hours',
            'actual_hours',
            'progress_percentage',
            'category',
            'tags',
            'comments',
            'checklist',
            'attachments',
            'created_at',
            'updated_at'
        ]


class CreateTaskSerializer(serializers.Serializer):
    """Serializer for creating new tasks"""
    title = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    assigned_to = serializers.UUIDField(required=True)
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'urgent'],
        default='medium'
    )
    due_date = serializers.DateField(required=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    
    def validate_due_date(self, value):
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError("Due date cannot be in the past")
        return value


class UpdateTaskSerializer(serializers.Serializer):
    """Serializer for updating tasks"""
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=['pending', 'in_progress', 'under_review', 'completed'],
        required=False
    )
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'urgent'],
        required=False
    )
    due_date = serializers.DateField(required=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    actual_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    progress_percentage = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=100
    )
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )