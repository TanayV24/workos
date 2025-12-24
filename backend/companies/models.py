# companies/models.py - COMPLETE FILE WITH COMPANYSHIFT MODEL

from django.db import models
from django.core.validators import URLValidator
import uuid
from django.contrib.auth.models import User
from users.models import User as CustomUser   
from datetime import timedelta
from django.utils import timezone


class Company(models.Model):
    SUBSCRIPTION_CHOICES = [
        ('free', 'Free'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic Information
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    # Contact Information
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(null=True, blank=True, validators=[URLValidator()])

    # Address
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)

    # Settings
    timezone = models.CharField(max_length=50, default='Asia/Kolkata', help_text='Timezone for the company')
    currency = models.CharField(max_length=3, default='INR', help_text='Currency code (e.g., INR, USD)')

    # Subscription
    is_active = models.BooleanField(default=True)
    subscription_plan = models.CharField(max_length=50, choices=SUBSCRIPTION_CHOICES, null=True, blank=True)
    subscription_valid_until = models.DateField(null=True, blank=True)

    # Registration Status
    registration_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending - Awaiting Admin Creation'),
            ('admin_created', 'Admin Created - Setup in Progress'),
            ('setup_complete', 'Setup Complete'),
        ],
        default='pending'
    )

    # Setup Completion Tracking
    setup_token = models.CharField(max_length=255, unique=True, null=True, blank=True)
    setup_token_expires_at = models.DateTimeField(null=True, blank=True)
    is_setup_complete = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'companies'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.name[:20].upper().replace(' ', '_')
        super().save(*args, **kwargs)


class CompanyAdmin(models.Model):
    """
    Extended admin profile for company administrators
    Links Django User with Company and Personal Email
    """

    # Relations
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_admin')
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='admin')

    # Personal Information
    personal_email = models.EmailField(help_text="Real personal email where credentials are sent")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    # Authentication
    temp_password_set = models.BooleanField(default=True, help_text="Whether admin is using temporary password")
    password_changed_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    # Status
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Company Setup Tracking
    company_setup_completed = models.BooleanField(default=False, help_text="Whether company setup wizard has been completed")
    setup_completed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_admins'
        verbose_name = 'Company Admin'
        verbose_name_plural = 'Company Admins'

    def __str__(self):
        return f"{self.full_name} - {self.company.name}"


class CompanyRegistrationToken(models.Model):
    """Track registration tokens for company setup links"""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='registration_tokens')
    token = models.CharField(max_length=255, unique=True)
    personal_email = models.EmailField()
    temp_company_email = models.EmailField()
    temp_password = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'company_registration_tokens'
        ordering = ['-created_at']

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Token for {self.company.name}"

    @staticmethod
    def generate_token():
        import secrets
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_temp_password():
        import secrets
        return secrets.token_urlsafe(12)


class CompanyDetails(models.Model):
    """
    Store detailed company configuration including work type, hours, and leave policy
    One-to-one relationship with Company table
    Single source of truth for company work configuration
    """

    WORK_TYPE_CHOICES = [
        ('fixed_hours', 'Fixed Working Hours'),
        ('shift_based', 'Shift Based'),
    ]

    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relationship
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='details')

    # Employee & Working Info
    total_employees = models.IntegerField(default=1)

    # Work Type: 'fixed_hours' or 'shift_based'
    work_type = models.CharField(max_length=20, choices=WORK_TYPE_CHOICES, default='fixed_hours', help_text='Type of work arrangement')

    # Fixed Hours (used when work_type = 'fixed_hours')
    start_time = models.TimeField(null=True, blank=True, help_text='Work start time (HH:MM format)')
    end_time = models.TimeField(null=True, blank=True, help_text='Work end time (HH:MM format)')

    # Shift Based (used when work_type = 'shift_based')
    shift_duration_minutes = models.IntegerField(null=True, blank=True, help_text='Total shift duration in minutes')

    # Break Configuration
    break_minutes = models.IntegerField(default=60, help_text='Break time in minutes (default 60)')

    # Leave Structure (Per Year)
    casual_leave_days = models.IntegerField(default=0)
    sick_leave_days = models.IntegerField(default=0)
    personal_leave_days = models.IntegerField(default=0)

    # Future Expandable Fields
    overtime_allowed = models.BooleanField(default=False)
    max_overtime_minutes = models.IntegerField(null=True, blank=True)
    weekend_work_allowed = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_details'
        verbose_name = 'Company Details'
        verbose_name_plural = 'Company Details'
        constraints = [
            models.UniqueConstraint(fields=['company'], name='unique_company_details'),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.get_work_type_display()}"

    def clean(self):
        """Validate work type specific requirements"""
        from django.core.exceptions import ValidationError

        if self.work_type == 'fixed_hours':
            if not self.start_time or not self.end_time:
                raise ValidationError('Start time and end time are required for fixed hours work type')
            if self.shift_duration_minutes is not None:
                raise ValidationError('Shift duration should be null for fixed hours work type')
        elif self.work_type == 'shift_based':
            if not self.shift_duration_minutes or self.shift_duration_minutes <= 0:
                raise ValidationError('Shift duration (in minutes) is required and must be > 0 for shift-based work type')
            if self.start_time is not None or self.end_time is not None:
                raise ValidationError('Start time and end time should be null for shift-based work type')


class Department(models.Model):
    """
    Department model for organizing employees
    Each company can have multiple departments (HR, Frontend, Backend, Surgery, etc.)
    Connects to:
    - Company (which department belongs to)
    - User (as head/manager of department)
    """

    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='departments')
    head = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='department_head_of', help_text="Department head/manager", to_field='id')

    # Basic Information
    name = models.CharField(max_length=100, help_text="e.g., HR, Frontend, Backend, Surgery, Cardiology, etc.")
    code = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Department code (e.g., HR-01)")
    description = models.TextField(null=True, blank=True, help_text="Department description")

    # Budget
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Department budget")

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'departments'
        unique_together = ['company', 'name']
        ordering = ['name']
        indexes = [
            models.Index(fields=['company', 'name']),
            models.Index(fields=['company_id', 'head_id']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} - {self.company.name}"


# ============================================
# COMPANY SHIFT MODEL
# ============================================

class CompanyShift(models.Model):
    """
    Work shifts for a company.
    
    Matches database table: public.company_shift
    
    Scenarios:
    1. Standard Office Hours  -> fixed_hours with start/end time
    2. Shift-Based Flexible   -> shift_based with duration (required_hours_per_day)
    3. Detailed Schedule      -> shift_based with multiple shifts (start/end times)
    """
    
    # Choices
    WORK_TYPE_CHOICES = [
        ('fixed_hours', 'Fixed Hours'),
        ('shift_based', 'Shift Based'),
    ]

    # Primary Key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Foreign Key
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='shifts'
    )

    # Work Type
    work_type = models.CharField(
        max_length=20,
        choices=WORK_TYPE_CHOICES
    )

    # Shift Name
    name = models.CharField(max_length=100)

    # Start Time
    start_time = models.TimeField(null=True, blank=True)

    # End Time
    end_time = models.TimeField(null=True, blank=True)

    # Required Hours Per Day
    required_hours_per_day = models.FloatField(null=True, blank=True)

    # Description
    description = models.TextField(null=True, blank=True)

    # Active Status
    is_active = models.BooleanField(default=True)

    # Created At
    created_at = models.DateTimeField(auto_now_add=True)

    # Updated At
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_shift'
        managed = False
        
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name'],
                name='shift_unique_company_name'
            ),
        ]
        
        indexes = [
            models.Index(fields=['company'], name='idx_shift_company_id'),
            models.Index(fields=['is_active'], name='idx_shift_is_active'),
        ]
        
        ordering = ['start_time', 'name']
        verbose_name = 'Company Shift'
        verbose_name_plural = 'Company Shifts'

    def __str__(self):
        return f"{self.name} - {self.company.name}"
