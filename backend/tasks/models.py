# FILE 1: backend/tasks/models.py

from django.db import models
import uuid
from django.utils import timezone


class TaskIntegrationSettings(models.Model):
    """
    Admin-configurable settings for task management
    One per company - controls all task permissions and behaviors
    """
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    company_id = models.UUIDField(unique=True, db_index=True)

    # ============================================
    # PERMISSION TOGGLES
    # ============================================
    
    # Allow employees to assign tasks across departments
    allow_intra_department_assignments = models.BooleanField(default=True)
    
    # Allow employees to assign tasks to others (at all)
    allow_employee_task_assignment = models.BooleanField(default=True)
    
    # Allow employees to create new tasks
    allow_employee_task_creation = models.BooleanField(default=True)
    
    # Allow assigning single task to multiple employees
    allow_multi_task_assignment = models.BooleanField(default=False)
    
    # Allow editing timeline/priority after task is assigned
    allow_timeline_priority_editing = models.BooleanField(default=True)
    
    # How to handle cross-department assignments
    # 'direct' = goes directly to employee
    # 'team_lead' = goes to team lead for approval first
    cross_department_task_redirection = models.CharField(
        max_length=20,
        choices=[
            ('direct', 'Direct Assignment'),
            ('team_lead', 'Team Lead Redirection')
        ],
        default='team_lead'
    )

    # ============================================
    # AUDIT
    # ============================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.UUIDField(null=True, blank=True)  # Admin who last updated

    class Meta:
        db_table = 'task_integration_settings'
        verbose_name_plural = 'Task Integration Settings'
        managed = True

    def __str__(self):
        return f"Task Settings - Company {self.company_id}"


class Task(models.Model):
    """
    Task model - Aligns with provided database schema
    Stores task details, assignments, status, and metadata
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('under_review', 'Under Review'),
        ('completed', 'Completed'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    # Primary key and company
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    company_id = models.UUIDField(db_index=True)

    # ============================================
    # TASK DETAILS
    # ============================================
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # ============================================
    # ASSIGNMENT
    # ============================================
    assigned_to = models.UUIDField(db_index=True)  # Employee receiving task
    assigned_by = models.UUIDField(db_index=True)  # Who created/assigned it

    # ============================================
    # STATUS & PRIORITY
    # ============================================
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )

    # ============================================
    # TIMELINE
    # ============================================
    created_date = models.DateField(default=timezone.now)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)

    # ============================================
    # HOURS TRACKING
    # ============================================
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    actual_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    # ============================================
    # PROGRESS
    # ============================================
    progress_percentage = models.IntegerField(default=0)

    # ============================================
    # METADATA
    # ============================================
    category = models.CharField(max_length=100, null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)

    # Parent task (for subtasks)
    parent_task_id = models.UUIDField(null=True, blank=True, db_index=True)

    # ============================================
    # CROSS-DEPARTMENT TRACKING
    # ============================================
    is_cross_department = models.BooleanField(default=False)
    assigned_department_id = models.UUIDField(null=True, blank=True)

    # If redirected to team lead for approval
    is_redirected_to_team_lead = models.BooleanField(default=False)
    team_lead_id = models.UUIDField(null=True, blank=True)
    team_lead_approval_pending = models.BooleanField(default=False)

    # ============================================
    # TIMESTAMPS
    # ============================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'tasks'
        managed = False
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company_id', 'assigned_to']),
            models.Index(fields=['company_id', 'status']),
            models.Index(fields=['assigned_by', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class TaskComment(models.Model):
    """
    Comments/chat on tasks
    Only assignee, assigner, team leads, and managers can comment
    HR cannot comment on tasks
    """
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    task_id = models.UUIDField(db_index=True)

    # Comment details
    content = models.TextField()
    posted_by = models.UUIDField(db_index=True)

    # Mentions (for future @mention feature)
    mentions = models.JSONField(default=list, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'task_comments'
        managed = False
        ordering = ['created_at']

    def __str__(self):
        return f"Comment on Task {self.task_id}"


class TaskChecklist(models.Model):
    """
    Checklist items within a task
    Allows breaking down tasks into sub-items
    """
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    task_id = models.UUIDField(db_index=True)

    # Item details
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # Completion status
    is_completed = models.BooleanField(default=False)
    completed_by = models.UUIDField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Order in list
    order_index = models.IntegerField()

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_checklist'
        managed = False
        unique_together = ('task_id', 'order_index')

    def __str__(self):
        return f"{self.title} (Task {self.task_id})"


class TaskAttachment(models.Model):
    """
    Files attached to tasks
    Stores file metadata and URLs
    """
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    task_id = models.UUIDField(db_index=True)

    # File details
    file_name = models.CharField(max_length=255)
    file_url = models.URLField()
    file_size = models.BigIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=50, null=True, blank=True)

    # Upload info
    uploaded_by = models.UUIDField()

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_attachments'
        managed = False

    def __str__(self):
        return f"{self.file_name} (Task {self.task_id})"