from django.db import models
from django.core.validators import URLValidator
import uuid
from datetime import datetime


class Company(models.Model):
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
        null=True,
        blank=True,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ]
    )
    subscription_valid_until = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'companies'  # ← TELLS DJANGO TO USE "companies" TABLE
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.name[:20].upper().replace(' ', '_')
        super().save(*args, **kwargs)
