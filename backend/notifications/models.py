# FILE 6: backend/notifications/models.py

from django.db import models
import uuid
from django.utils import timezone


class Notification(models.Model):
    """
    Notification model for task-related events
    Tracks all notifications sent to users about task activities
    """
    
    TYPE_CHOICES = [
        ('task_assigned', 'Task Assigned'),
        ('status_changed', 'Status Changed'),
        ('timeline_updated', 'Timeline Updated'),
        ('priority_updated', 'Priority Updated'),
        ('comment_added', 'Comment Added'),
    ]
    
    # ============================================
    # CORE FIELDS
    # ============================================
    
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    
    # Recipient
    user_id = models.UUIDField(db_index=True)  # User receiving notification
    company_id = models.UUIDField(db_index=True)  # Company context
    
    # ============================================
    # NOTIFICATION DETAILS
    # ============================================
    
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # ============================================
    # RELATED TASK
    # ============================================
    
    related_task_id = models.UUIDField(null=True, blank=True, db_index=True)
    related_task_title = models.CharField(max_length=255, null=True, blank=True)
    
    # ============================================
    # METADATA
    # ============================================
    
    triggered_by = models.UUIDField(null=True, blank=True)  # User who triggered it
    read = models.BooleanField(default=False, db_index=True)
    
    # ============================================
    # TIMESTAMPS
    # ============================================
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # Soft delete
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['user_id', 'read']),
            models.Index(fields=['company_id', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.title}"