from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, CompanyAdmin, CompanyRegistrationToken, CompanyDetails
from datetime import timedelta
from django.utils import timezone
import secrets

# ==========================================
# 1. COMPANY REGISTER SERIALIZER
# ==========================================

class CompanyRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'name', 'email', 'phone', 'website',
            'address', 'city', 'state', 'country', 'pincode',
            'timezone', 'currency'
        ]

    def validate_name(self, value):
        if Company.objects.filter(name=value).exists():
            raise serializers.ValidationError("Company already exists")
        return value

    def create(self, validated_data):
        company = Company.objects.create(**validated_data)
        company.registration_status = 'pending'
        company.save()
        return company


# ==========================================
# 2. COMPANY ADMIN CREATE SERIALIZER
# ==========================================

class CompanyAdminCreateSerializer(serializers.Serializer):
    company_id = serializers.UUIDField(required=True)
    full_name = serializers.CharField(max_length=255, required=True)
    personal_email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_company_id(self, value):
        try:
            Company.objects.get(id=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Company not found")
        return value

    def create(self, validated_data):
        from .email import CompanyEmailService

        company_id = validated_data['company_id']
        personal_email = validated_data['personal_email']
        full_name = validated_data['full_name']
        phone = validated_data.get('phone', '')

        company = Company.objects.get(id=company_id)
        temp_company_email = f"admin@{company.code.lower()}.com"
        temp_password = secrets.token_urlsafe(12)

        user = User.objects.create_user(
            username=temp_company_email,
            email=temp_company_email,
            password=temp_password,
            first_name=full_name.split()[0] if full_name.split() else 'Admin',
            last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else ''
        )

        admin = CompanyAdmin.objects.create(
            user=user,
            company=company,
            personal_email=personal_email,
            full_name=full_name,
            phone=phone,
            temp_password_set=True
        )

        token = CompanyRegistrationToken.objects.create(
            company=company,
            token=secrets.token_urlsafe(32),
            personal_email=personal_email,
            temp_company_email=temp_company_email,
            temp_password=temp_password,
            expires_at=timezone.now() + timedelta(hours=72)
        )

        try:
            CompanyEmailService.send_admin_credentials(
                personal_email=personal_email,
                company_name=company.name,
                admin_email=temp_company_email,
                temp_password=temp_password,
                token=token.token
            )
        except Exception as e:
            print(f"Email error: {str(e)}")

        return {
            'admin_id': str(admin.id),
            'company_email': temp_company_email,
            'personal_email': personal_email,
            'temp_password_sent': True,
            'password_expires_in': '72 hours'
        }


# ==========================================
# 3. LOGIN SERIALIZER
# ==========================================

class CompanyAdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    role = serializers.CharField(required=False, default='admin')


# ==========================================
# 4. CHANGE PASSWORD SERIALIZER
# ==========================================

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Min 8 characters")
        return value

    def validate(self, data):
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords dont match'})
        return data


# ==========================================
# 5. DASHBOARD SERIALIZER
# ==========================================

class DashboardDataSerializer(serializers.Serializer):
    company = serializers.SerializerMethodField()
    admin = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    def get_company(self, obj):
        company = obj.get('company')
        return {
            'id': str(company.id),
            'name': company.name,
            'setup_complete': company.is_setup_complete,
            'setup_percentage': 100 if company.is_setup_complete else 40,
        }

    def get_admin(self, obj):
        admin = obj.get('admin')
        return {
            'full_name': admin.full_name,
            'personal_email': admin.personal_email,
            'temp_password': admin.temp_password_set,
        }

    def get_stats(self, obj):
        return {
            'total_employees': 0,
            'pending_approvals': 0,
        }


# ==========================================
# 6. COMPANY DETAILS SERIALIZER (NEW)
# ==========================================

class CompanyDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyDetails
        fields = [
            'total_employees',
            'work_type',
            'start_time',
            'end_time',
            'shift_duration_minutes',
            'break_minutes',
            'casual_leave_days',
            'sick_leave_days',
            'personal_leave_days',
            'overtime_allowed',
            'max_overtime_minutes',
            'weekend_work_allowed',
            'flexible_hours',
        ]


# ==========================================
# 7. COMPANY SETUP SERIALIZER (UPDATED)
# ==========================================

class CompanySetupSerializer(serializers.Serializer):
    """
    Updated to use CompanyDetails table instead of storing in CompanyAdmin
    """
    # Company info
    companyname = serializers.CharField(max_length=255, required=True)
    companywebsite = serializers.CharField(required=False, allow_blank=True)
    companyindustry = serializers.CharField(max_length=100, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=50, required=False, default='IST')
    currency = serializers.CharField(max_length=10, required=False, default='INR')

    # Company Details fields
    totalemployees = serializers.IntegerField(required=True, min_value=1)

    # Work type: 'fixed_hours' or 'shift_based'
    work_type = serializers.ChoiceField(
        choices=['fixed_hours', 'shift_based'],
        required=True
    )

    # Fixed hours (used when work_type = 'fixed_hours')
    workinghoursstart = serializers.TimeField(required=False, allow_null=True)
    workinghoursend = serializers.TimeField(required=False, allow_null=True)

    # Shift based (used when work_type = 'shift_based')
    shift_duration_minutes = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    # Break configuration (default 1 hour / 60 minutes)
    break_minutes = serializers.IntegerField(required=False, default=60, min_value=0)

    # Leave policy
    casualleavedays = serializers.IntegerField(required=False, default=0, min_value=0)
    sickleavedays = serializers.IntegerField(required=False, default=0, min_value=0)
    personalleavedays = serializers.IntegerField(required=False, default=0, min_value=0)

    def validate_companyname(self, value):
        if not value.strip():
            raise serializers.ValidationError("Company name cannot be empty")
        return value

    def validate(self, attrs):
        """
        Validate work_type specific requirements
        """
        work_type = attrs.get('work_type')

        if work_type == 'fixed_hours':
            # Require start and end times for fixed hours
            if not attrs.get('workinghoursstart') or not attrs.get('workinghoursend'):
                raise serializers.ValidationError(
                    "Start time and end time are required for fixed_hours work type."
                )
            # Shift duration should be None for fixed_hours
            attrs['shift_duration_minutes'] = None

        elif work_type == 'shift_based':
            # Require shift duration for shift-based
            if not attrs.get('shift_duration_minutes'):
                raise serializers.ValidationError(
                    "shift_duration_minutes is required for shift_based work type."
                )
            # Start/end times should be None for shift_based
            attrs['workinghoursstart'] = None
            attrs['workinghoursend'] = None

        return attrs


# ==========================================
# 8. PROFILE & NOTIFICATION SERIALIZERS
# ==========================================

class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    department = serializers.CharField(required=False, allow_blank=True, max_length=100)


class NotificationSettingsSerializer(serializers.Serializer):
    email_notifications = serializers.BooleanField(default=True)
    push_notifications = serializers.BooleanField(default=True)
    sms_notifications = serializers.BooleanField(default=False)
    leave_approvals = serializers.BooleanField(default=True)
    task_assignments = serializers.BooleanField(default=True)
    payroll_updates = serializers.BooleanField(default=True)