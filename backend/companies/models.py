# companies/models.py

from django.db import models
from django.core.validators import URLValidator
import uuid
from django.contrib.auth.models import User
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
    email = models.EmailField(null=True, blank=True)  # Official company email
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(null=True, blank=True, validators=[URLValidator()])

    # Address
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)

    # Settings
    timezone = models.CharField(
        max_length=50,
        default='Asia/Kolkata',
        help_text='Timezone for the company'
    )
    currency = models.CharField(
        max_length=3,
        default='INR',
        help_text='Currency code (e.g., INR, USD)'
    )

    # Subscription
    is_active = models.BooleanField(default=True)
    subscription_plan = models.CharField(
        max_length=50,
        choices=SUBSCRIPTION_CHOICES,
        null=True,
        blank=True
    )
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


# Extended admin profile for company administrators
class CompanyAdmin(models.Model):
    """
    Extended admin profile for company administrators
    Links Django User with Company and Personal Email
    """
    
    # Relations
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_admin')
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='admin')

    # Personal Information
    personal_email = models.EmailField(
        help_text="Real personal email where credentials are sent"
    )
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)

    # Authentication
    temp_password_set = models.BooleanField(
        default=True,
        help_text="Whether admin is using temporary password"
    )
    password_changed_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    # Status
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_admins'
        verbose_name = 'Company Admin'
        verbose_name_plural = 'Company Admins'

    def __str__(self):
        return f"{self.full_name} - {self.company.name}"
    


 # Model to track registration tokens for company setup links   
class CompanyRegistrationToken(models.Model):
    """Track registration tokens for company setup links
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='registration_tokens')
    token = models.CharField(max_length=255, unique=True)
    personal_email = models.EmailField()
    temp_company_email = models.EmailField()
    temp_password = models.CharField(max_length=255)  # Store encrypted
    
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'company_registration_tokens'
        ordering = ['-created_at']

    def is_valid(self):
        return (
            not self.is_used and 
            timezone.now() < self.expires_at
        )

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