from django.db import models
from django.utils import timezone
import uuid

# ============================================
# Task Status & Priority Choices
# ============================================

TASK_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in_progress', 'In Progress'),
    ('under_review', 'Under Review'),
    ('completed', 'Completed'),
]

TASK_PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
    ('urgent', 'Urgent'),
]


# ============================================
# Task Model
# ============================================

class Task(models.Model):
    """
    Task model - corresponds to public.tasks in database
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField()
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    assigned_to = models.UUIDField()
    assigned_by = models.UUIDField()
    created_date = models.DateField(auto_now_add=True, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=TASK_PRIORITY_CHOICES, default='medium')
    progress_percentage = models.IntegerField(default=0)
    category = models.CharField(max_length=100, null=True, blank=True)
    tags = models.JSONField(default=list, null=True, blank=True)  # ← USE JSONField (your DB has jsonb)
    parent_task_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"

    def is_overdue(self):
        """Check if task is overdue"""
        if self.status == 'completed':
            return False
        return timezone.now().date() > self.due_date


# ============================================
# TaskComment Model
# ============================================

class TaskComment(models.Model):
    """
    Comments on tasks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.UUIDField()
    user_id = models.UUIDField(null=True, blank=True)  # ← nullable to avoid migration issues
    comment = models.TextField()
    mentions = models.JSONField(default=list, null=True, blank=True)  # ← USE JSONField
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user_id} on task {self.task_id}"


# ============================================
# TaskChecklist Model
# ============================================

class TaskChecklist(models.Model):
    """
    Checklist items for tasks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.UUIDField()
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    completed_by = models.UUIDField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    order_index = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'task_checklist'
        ordering = ['order_index']
        unique_together = ('task_id', 'order_index')

    def __str__(self):
        return f"{self.title}"


# ============================================
# TaskAttachment Model
# ============================================

class TaskAttachment(models.Model):
    """
    File attachments for tasks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.UUIDField()
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_size = models.BigIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'task_attachments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name}"


# ============================================
# TaskIntegrationSettings Model
# ============================================

class TaskIntegrationSettings(models.Model):
    """
    Settings for task management features per company
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_id = models.UUIDField(unique=True)
    allow_employee_task_creation = models.BooleanField(default=False)
    allow_employee_task_assignment = models.BooleanField(default=False)
    allow_intra_department_assignments = models.BooleanField(default=True)
    allow_multi_task_assignment = models.BooleanField(default=False)
    allow_timeline_priority_editing = models.BooleanField(default=False)
    cross_department_task_redirection = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('team_lead', 'Team Lead'),
            ('department_head', 'Department Head'),
        ],
        default='none'
    )
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_integration_settings'

    def __str__(self):
        return f"Settings for {self.company_id}"
