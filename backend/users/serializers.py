from rest_framework import serializers
from .models import User
from companies.models import Department
from .models import User
import re
from django.contrib.auth.models import User as DjangoUser


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'temp_password', 'profile_completed']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'company_id', 'head_id']

class AddDepartmentSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    code = serializers.CharField(max_length=10, required=True)
    description = serializers.CharField(max_length=500, required=True)
    
    def validate_code(self, value):
        code = value.strip().upper()
        if len(code) < 3 or len(code) > 4:
            raise serializers.ValidationError("Code must be 3-4 characters")
        if not code.isalnum():
            raise serializers.ValidationError("Code must be alphanumeric only")
        return code
    
    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters")
        return value.strip()
    
    def validate_description(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Description must be at least 5 characters")
        return value.strip()

class AddEmployeeSerializer(serializers.Serializer):
    """Serializer for adding new employee - FIXED VERSION"""
    
    name = serializers.CharField(
        required=True,
        min_length=1,
        error_messages={'required': 'Name is required'}
    )
    email = serializers.EmailField(
        required=True,
        error_messages={'required': 'Email is required'}
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        default=''
    )
    role = serializers.ChoiceField(
        choices=['employee', 'manager', 'hr'],  # ← FIXED: Changed from team_lead
        default='employee'
    )
    department = serializers.CharField(  # ← FIXED: Changed from department_id
        required=False,
        allow_blank=True,
        default='',
        help_text='Department name (e.g., "IT", "HR", "Sales")'
    )
    designation = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text='Job designation (e.g., "Senior Developer", "Manager")'
    )
    
    def validate_email(self, value):
        """Validate email is not already in use"""
        value = value.lower().strip()
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists in users table")
        
        if DjangoUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Email already registered in system")
        
        return value
    
    def validate_name(self, value):
        """Validate name is not empty after stripping"""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty")
        return value
    
    def validate(self, data):
        """Additional validation"""
        # Strip all string fields
        for field in ['name', 'email', 'phone', 'department', 'designation']:
            if field in data and isinstance(data[field], str):
                data[field] = data[field].strip()
        
        return data

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'company_id', 'department_id']

# class EmployeeListSerializer(serializers.ModelSerializer):
#     department = serializers.CharField(source='department.name', read_only=True)
#     department_id = serializers.UUIDField(source='department.id', read_only=True)

#     class Meta:
#         model = Employee
#         fields = [
#             'id','name', 'name', 'email','phone', 'status', 'join_date', 'designation', 'location', 'department', 'department_id', ]