from rest_framework import serializers
from .models import Company
from datetime import datetime

class CompanySerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'code',
            'email',
            'phone',
            'website',
            'address',
            'city',
            'state',
            'country',
            'pincode',
            'timezone',
            'currency',
            'is_active',
            'subscription_plan',
            'subscription_valid_until',
            'created_at',
            'updated_at',
            'deleted_at',
            'status_display',
            'days_until_expiry',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]
    
    def get_status_display(self, obj):
        return 'Active' if obj.is_active else 'Inactive'
    
    def get_days_until_expiry(self, obj):
        if obj.subscription_valid_until:
            days = (obj.subscription_valid_until - datetime.now().date()).days
            return max(0, days)
        return None
    
    def validate_email(self, value):
        if value and Company.objects.filter(email=value).exists():
            raise serializers.ValidationError("Company with this email already exists.")
        return value
    
    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Company name must be at least 2 characters long.")
        return value.strip()
