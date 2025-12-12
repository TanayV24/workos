# users/models.py - MINIMAL WRAPPER for existing users table

from django.db import models
from django.contrib.auth.hashers import make_password, check_password
import uuid
from django.utils import timezone

class User(models.Model):
    """
    Django wrapper for the existing users table in your schema
    Maps to: CREATE TABLE users (...)
    """
    
    # Map to existing columns
    id = models.UUIDField(primary_key=True, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    
    # The 4 NEW columns we added
    role = models.CharField(
        max_length=50,
        default='employee',
        choices=[
            ('manager', 'Manager'),
            ('hr', 'HR'),
            ('team_lead', 'Team Lead'),
            ('employee', 'Employee'),
        ],
        db_index=True
    )
    password_hash = models.CharField(max_length=255)
    temp_password = models.BooleanField(default=True, db_index=True)
    profile_completed = models.BooleanField(default=False, db_index=True)
    
    # Company relationship (should exist in your schema)
    company_id = models.UUIDField(null=True, blank=True)
    department_id = models.UUIDField(null=True, blank=True)
    
    # Tracking fields
    password_changed_at = models.DateTimeField(null=True, blank=True)
    profile_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Existing schema fields
    status = models.CharField(max_length=20, default='active')
    employee_type = models.CharField(max_length=20, default='permanent')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'  # ← Map to existing table
        managed = False     # ← CRITICAL: Don't let Django manage it
    
    def __str__(self):
        return f"{self.name} ({self.role}) - {self.email}"
    
    # Password methods
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password against hash"""
        return check_password(raw_password, self.password_hash)
    
    # State change methods
    def mark_password_changed(self):
        """Mark password as changed (not temp anymore)"""
        self.temp_password = False
        self.password_changed_at = timezone.now()
        self.save()
    
    def mark_profile_completed(self):
        """Mark profile as completed"""
        self.profile_completed = True
        self.profile_completed_at = timezone.now()
        self.save()
