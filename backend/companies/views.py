# companies/views.py - UNIFIED ENDPOINTS FOR ALL USERS
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from users.models import User as UsersAppUser
from .models import Company, CompanyAdmin, CompanyRegistrationToken, CompanyDetails, CompanyShift
from .serializers import (
    CompanyRegisterSerializer,
    CompanyAdminCreateSerializer,
    CompanyAdminLoginSerializer,
    ChangePasswordSerializer,
    DashboardDataSerializer,
    CompanySetupSerializer,
    CompanyDetailsSerializer,
)
from .email import CompanyEmailService
import uuid
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.mail import send_mail
import logging
import re
import secrets

logger = logging.getLogger(__name__)

# ============================================
# COMPANY VIEWSET - Registration
# ============================================

class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for company operations
    Endpoints:
    - POST /api/companies/register/
    """
    queryset = Company.objects.all()
    serializer_class = CompanyRegisterSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """
        Register a new company
        """
        serializer = CompanyRegisterSerializer(data=request.data)
        if serializer.is_valid():
            company = serializer.save()
            return Response({
                'success': True,
                'data': {
                    'id': str(company.id),
                    'name': company.name,
                    'code': company.code,
                    'email': company.email,
                    'registration_status': company.registration_status
                }
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

# ============================================
# AUTH VIEWSET - Login, Password Change, Setup
# ============================================

class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for authentication operations
    Endpoints:
    - POST /api/auth/login/ (✅ UNIFIED for ALL users)
    - POST /api/auth/change_temp_password/ (✅ UNIFIED for ALL users)
    - POST /api/auth/company_setup/
    - POST /api/auth/add_hr/
    - POST /api/auth/add_manager/
    - GET /api/auth/profile/
    """

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        ✅ UNIFIED LOGIN ENDPOINT FOR ALL USERS (Admin + HR/Manager/Employee)
        - Accepts: email, password
        - Returns: role-specific response with temp_password and profile_completed flags
        """
        email = request.data.get('email')
        password = request.data.get('password')

        print("\n" + "="*80)
        print("🔐 LOGIN ATTEMPT (UNIFIED ENDPOINT)")
        print(f"Email: {email}")
        print(f"Password length: {len(password) if password else 0}")
        print("="*80)

        if not email or not password:
            print("❌ Missing email or password")
            return Response({
                'success': False,
                'error': 'Email and password required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Try to find user by email
        print(f"\n🔍 Searching for user with email: {email}")
        try:
            user = User.objects.get(email=email)
            print(f"✓ User found: {user.username}")
        except User.DoesNotExist:
            print(f"❌ User NOT found with email: {email}")
            all_users = User.objects.all()
            print(f"📋 Total users in DB: {all_users.count()}")
            for u in all_users:
                print(f" - {u.username} ({u.email})")
            return Response({
                'success': False,
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Check password
        password_valid = False
        print(f"\n🔐 Checking password...")
        
        # Try hashed password first
        print(f" Try 1: Hashed password check...")
        if user.check_password(password):
            password_valid = True
            print(f" ✓ Password valid (HASHED)")
        else:
            print(f" ✗ Hashed check failed")

        # Try plain text password (for admin-created users)
        if not password_valid:
            print(f" Try 2: Plain text password check...")
            if user.password == password:
                password_valid = True
                print(f" ✓ Password valid (PLAIN TEXT)")
                # Auto-hash it for future logins
                user.set_password(password)
                user.save()
                print(f" ✓ Password hashed and saved")
            else:
                print(f" ✗ Plain text check failed")

        if not password_valid:
            print(f"❌ PASSWORD INVALID")
            return Response({
                'success': False,
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)

        print(f"✓ Password authentication successful")

        # Generate JWT tokens
        print(f"\n🎫 Generating JWT tokens...")
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        print(f"✓ Tokens generated successfully")

        # Initialize response variables
        user_role = 'unknown'
        temp_password = False
        company_id = None
        company_name = "Unknown"
        full_name = user.first_name or user.username
        company_setup_completed = None
        profile_completed = None

        print(f"\n👤 Fetching user info...")

        # Try to get CompanyAdmin (for admin users)
        try:
            admin = CompanyAdmin.objects.get(user=user)
            temp_password = admin.temp_password_set
            company_id = str(admin.company.id)
            company_name = admin.company.name
            full_name = admin.full_name
            company_setup_completed = admin.company_setup_completed
            user_role = 'company_admin'
            print(f"✓ CompanyAdmin found - role: company_admin")
        except CompanyAdmin.DoesNotExist:
            print(f"⚠️ CompanyAdmin NOT found, checking UsersAppUser table...")

            # Try to get UsersAppUser (for HR/Manager/Employee)
            try:
                supabase_user = UsersAppUser.objects.get(email=user.email)
                temp_password = supabase_user.temp_password
                profile_completed = supabase_user.profile_completed
                user_role = supabase_user.role
                full_name = supabase_user.name
                company_id = str(supabase_user.company_id) if supabase_user.company_id else None

                if supabase_user.company_id:
                    try:
                        company = Company.objects.get(id=supabase_user.company_id)
                        company_name = company.name
                    except Company.DoesNotExist:
                        company_name = "Unknown"
                else:
                    company_name = "Unknown"

                print(f"✓ UsersAppUser found - role: {user_role}, temp_password: {temp_password}")
            except UsersAppUser.DoesNotExist:
                print(f"⚠️ UsersAppUser NOT found either")
                user_role = 'unknown'
                temp_password = False

        response_data = {
            'success': True,
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'username': user.username,
                    'full_name': full_name,
                    'company_id': company_id,
                    'company_name': company_name,
                    'temp_password': temp_password,
                    'company_setup_completed': company_setup_completed,
                    'profile_completed': profile_completed,
                    'role': user_role,
                }
            }
        }

        print(f"\n✅ LOGIN SUCCESSFUL")
        print(f"User: {full_name} ({email})")
        print(f"Role: {user_role}")
        print("="*80 + "\n")

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='change_temp_password')
    def change_temp_password(self, request):
        """
        ✅ UNIFIED CHANGE TEMP PASSWORD FOR ALL USERS (Admin + HR/Manager/Employee)
        Path: /api/auth/change_temp_password/
        """
        print("\n" + "="*80)
        print("🔐 CHANGE TEMP PASSWORD (UNIFIED ENDPOINT)")
        print(f"User: {request.user.email}")
        print(f"User authenticated: {request.user.is_authenticated}")
        print("="*80)

        # Check if user is authenticated
        if not request.user.is_authenticated:
            print("❌ User NOT authenticated!")
            return Response({
                'success': False,
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        print(f"Old password provided: {bool(old_password)}")
        print(f"New password provided: {bool(new_password)}")

        # Validation
        if not old_password or not new_password:
            print("❌ Missing passwords")
            return Response({
                'success': False,
                'error': 'Old and new passwords are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            print("❌ New password too short")
            return Response({
                'success': False,
                'error': 'New password must be at least 8 characters'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify old password
        print(f"\n🔐 Verifying old password...")
        password_valid = False

        # Try hashed password first
        if user.check_password(old_password):
            password_valid = True
            print(f"✓ Old password valid (HASHED)")

        # Try plain text password
        elif user.password == old_password:
            password_valid = True
            print(f"✓ Old password valid (PLAIN TEXT)")

        if not password_valid:
            print(f"❌ Old password incorrect")
            print(f"Stored: {user.password[:50]}...")
            print(f"Provided: {old_password}")
            return Response({
                'success': False,
                'error': 'Current password is incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Set new password in Django User
        print(f"\n✓ Setting new password in Django User...")
        user.set_password(new_password)
        user.save()
        print(f"✓ New password saved in auth_user table")

        user_role = 'unknown'
        temp_password = False
        profile_completed = None
        company_setup_completed = None
        full_name = user.first_name or user.username
        company_id = None
        company_name = "Unknown"

        # Update CompanyAdmin if this is an admin user
        print(f"\n👤 Checking if user is CompanyAdmin...")
        try:
            admin = CompanyAdmin.objects.get(user=user)
            admin.temp_password_set = False
            admin.password_changed_at = timezone.now()
            admin.save()
            user_role = 'company_admin'
            company_id = str(admin.company.id)
            company_name = admin.company.name
            full_name = admin.full_name
            company_setup_completed = admin.company_setup_completed
            print(f"✓ CompanyAdmin updated - temp_password_set = False")
        except CompanyAdmin.DoesNotExist:
            print(f"⚠️ CompanyAdmin NOT found, checking UsersAppUser...")

            # Update UsersAppUser if this is an HR/Manager/Employee user
            try:
                supabase_user = UsersAppUser.objects.get(email=user.email)
                supabase_user.set_password(new_password)
                supabase_user.temp_password = False
                supabase_user.password_changed_at = timezone.now()
                supabase_user.save()

                supabase_user = UsersAppUser.objects.get(email=user.email)
                temp_password = supabase_user.temp_password
                profile_completed = supabase_user.profile_completed
                user_role = supabase_user.role
                full_name = supabase_user.name
                company_id = str(supabase_user.company_id) if supabase_user.company_id else None

                if supabase_user.company_id:
                    try:
                        company = Company.objects.get(id=supabase_user.company_id)
                        company_name = company.name
                    except Company.DoesNotExist:
                        company_name = "Unknown"
                else:
                    company_name = "Unknown"

                print(f"✓ UsersAppUser updated - temp_password = False")
            except UsersAppUser.DoesNotExist:
                print(f"⚠️ UsersAppUser NOT found either")
                user_role = 'unknown'
                temp_password = False

        print(f"\n✅ PASSWORD CHANGED SUCCESSFULLY")
        print(f"User: {user.email}")
        print("="*80 + "\n")

        response_data = {
            'success': True,
            'message': 'Password changed successfully',
            'data': {
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'username': user.username,
                    'full_name': full_name,
                    'company_id': company_id,
                    'company_name': company_name,
                    'temp_password': False,
                    'company_setup_completed': company_setup_completed,
                    'profile_completed': profile_completed,
                    'role': user_role,
                }
            }
        }

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='company_setup')
    def company_setup(self, request):
        """
        ✅ CORRECTED: Proper storage based on work_type selection
        Handles 3 scenarios:
        1. Standard Office Hours → fixed_hours with start/end time
        2. Shift-Based Flexible → shift_based with duration minutes
        3. Detailed Schedule → shift_based with multiple shifts
        """
        
        try:
            user = request.user
            company_admin = CompanyAdmin.objects.get(user=user)
            
            print("\n" + "="*80)
            print("🏢 COMPANY SETUP - SCENARIO DETECTION")
            print(f"Admin: {company_admin.full_name}")
            print(f"Company: {company_admin.company.name}")
            print("="*80)
            
            # Check if already setup
            if company_admin.company_setup_completed:
                return Response({
                    'success': False,
                    'error': 'Company setup already completed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the incoming data
            data = request.data
            print(f"\n📦 Received data: {list(data.keys())}")
            
            # Validate company basic info
            if not data.get('companyname'):
                return Response({
                    'success': False,
                    'error': 'Company name is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get company
            company = company_admin.company
            
            # ========== UPDATE COMPANY ==========
            company.name = data.get('companyname', company.name)
            company.website = data.get('companywebsite', company.website or '')
            company.company_industry = data.get('companyindustry')
            company.timezone = data.get('timezone', 'Asia/Kolkata')
            company.currency = data.get('currency', 'INR')
            company.save()
            print(f"\n✓ Company basic info saved: {company.name}")
            
            # ========== CREATE/UPDATE COMPANY_DETAILS ==========
            print(f"\n✨ Processing Company Details...")
            details, created = CompanyDetails.objects.get_or_create(company=company)
            
            details.total_employees = data.get('totalemployees', 1)
            details.break_minutes = data.get('break_minutes', 60)
            details.casual_leave_days = data.get('casualleavedays', 0)
            details.sick_leave_days = data.get('sickleavedays', 0)
            details.personal_leave_days = data.get('personalleavedays', 0)
            
            work_type = data.get('work_type')  # 'fixedhours' or 'shiftbased'
            print(f"\n🔍 Work Type: {work_type}")
            
            # ========== SCENARIO 1: STANDARD OFFICE HOURS ==========
            if work_type == 'fixed_hours':
                print("📋 SCENARIO 1: Standard Office Hours")
                
                details.work_type = 'fixed_hours'
                details.start_time = data.get('workinghoursstart')  # "09:00"
                details.end_time = data.get('workinghoursend')      # "18:00"
                details.shift_duration_minutes = None
                details.save()
                
                print(f"   ✓ Start Time: {details.start_time}")
                print(f"   ✓ End Time: {details.end_time}")
                
                # Create single shift for standard hours
                shift_name = "Standard Hours"
                company_shift, _ = CompanyShift.objects.update_or_create(
                    company=company,
                    name=shift_name,
                    defaults={
                        'work_type': 'fixed_hours',
                        'start_time': details.start_time,
                        'end_time': details.end_time,
                        'required_hours_per_day': None,
                        'description': 'Standard working hours for all employees',
                        'is_active': True,
                    }
                )
                print(f"   ✓ Created shift: {shift_name}")
                shift_id = str(company_shift.id)
            
            # ========== SCENARIO 2 & 3: SHIFT-BASED ==========
            elif work_type == 'shift_based':
                details.work_type = 'shift_based'
                details.start_time = None
                details.end_time = None
                
                # Check if it's flexible hours OR detailed schedule
                shift_duration = data.get('shift_duration_minutes')  # For Scenario 2
                shifts_data = data.get('shifts', [])  # For Scenario 3
                
                # SCENARIO 2: Flexible Hours (just overall duration)
                if shift_duration and not shifts_data:
                    print("📋 SCENARIO 2: Shift-Based Flexible Hours")
                    
                    details.shift_duration_minutes = shift_duration
                    details.save()
                    print(f"   ✓ Shift Duration: {shift_duration} minutes")
                    
                    # Create single flexible shift
                    shift_name = "Flexible Shift"
                    company_shift, _ = CompanyShift.objects.update_or_create(
                        company=company,
                        name=shift_name,
                        defaults={
                            'work_type': 'shift_based',
                            'start_time': None,
                            'end_time': None,
                            'required_hours_per_day': float(shift_duration) / 60,  # Convert to hours
                            'description': f'Employees need to complete {shift_duration} minutes per day',
                            'is_active': True,
                        }
                    )
                    print(f"   ✓ Created shift: {shift_name} ({shift_duration} min/day)")
                    shift_id = str(company_shift.id)
                
                # SCENARIO 3: Detailed Schedule (multiple shifts)
                elif shifts_data:
                    print(f"📋 SCENARIO 3: Detailed Work Schedule ({len(shifts_data)} shifts)")
                    
                    details.shift_duration_minutes = None
                    details.save()
                    
                    shift_id = None
                    created_shifts = []
                    
                    # Delete old shifts for this company (fresh start)
                    CompanyShift.objects.filter(company=company).delete()
                    print(f"   ✓ Cleared old shifts")
                    
                    # Create each shift from UI
                    for idx, shift_data in enumerate(shifts_data):
                        shift_name = shift_data.get('name', '').strip()
                        start_time = shift_data.get('startTime')
                        end_time = shift_data.get('endTime')
                        required_hours = shift_data.get('requiredHours')
                        description = shift_data.get('description', '')
                        is_default = shift_data.get('is_default', False)  # Check if marked as default
                        
                        if not shift_name:
                            print(f"   ⚠️ Shift {idx + 1}: Name missing, skipping")
                            continue
                        
                        company_shift = CompanyShift.objects.create(
                            company=company,
                            work_type='shift_based',
                            name=shift_name,
                            start_time=start_time,  # "09:00" for morning shift
                            end_time=end_time,      # "15:00" for morning shift
                            required_hours_per_day=float(required_hours) if required_hours else None,
                            description=description,
                            is_active=True,
                        )
                        
                        created_shifts.append({
                            'id': str(company_shift.id),
                            'name': shift_name,
                            'start_time': str(start_time) if start_time else None,
                            'end_time': str(end_time) if end_time else None,
                        })
                        
                        # Set first shift as default if not specified
                        if idx == 0 or is_default:
                            shift_id = str(company_shift.id)
                        
                        print(f"   ✓ Shift {idx + 1}: {shift_name} ({start_time}-{end_time})")
                
                else:
                    return Response({
                        'success': False,
                        'error': 'Shift-based setup requires either duration or shifts data'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                return Response({
                    'success': False,
                    'error': f'Invalid work type: {work_type}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== FINALIZE SETUP ==========
            company_admin.company_setup_completed = True
            company_admin.setup_completed_at = timezone.now()
            company_admin.save()
            
            print(f"\n✅ Setup completed successfully!")
            print("="*80 + "\n")
            
            return Response({
                'success': True,
                'message': 'Company setup completed successfully',
                'data': {
                    'company_id': str(company.id),
                    'company_name': company.name,
                    'work_type': details.work_type,
                    'default_shift_id': shift_id,
                }
            }, status=status.HTTP_200_OK)
            
        except CompanyAdmin.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Company admin not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            print(f"❌ Setup error: {str(e)}")
            logger.exception("Company setup error: %s", e)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='add_hr')
    def add_hr(self, request):
        """
        ✅ CORRECTED: Add HR Manager using PERSONAL EMAIL as login
        """
        try:
            # Step 1: Get company from requesting admin
            try:
                company_admin = CompanyAdmin.objects.get(user=request.user)
                company = company_admin.company
            except CompanyAdmin.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Company admin not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            print("\n" + "="*80)
            print("➕ ADD HR MANAGER")
            print(f"Company: {company.name}")
            print("="*80)

            # Step 2: Get and validate input
            name = (request.data.get('name') or "").strip()
            personal_email = (request.data.get('email') or "").strip().lower()

            if not name or not personal_email:
                return Response(
                    {'success': False, 'error': 'Name and email are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"\n📝 Input:")
            print(f" Name: {name}")
            print(f" Personal Email (for login): {personal_email}")

            # Step 3: Email format validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, personal_email):
                return Response(
                    {'success': False, 'error': 'Invalid email format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Step 4: Check for duplicates
            print(f"\n🔍 Checking for duplicates...")

            if User.objects.filter(username=personal_email).exists():
                print(f"❌ DUPLICATE: Django User username '{personal_email}' already exists")
                return Response(
                    {'success': False, 'error': f'Email {personal_email} is already registered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if UsersAppUser.objects.filter(email=personal_email).exists():
                print(f"❌ DUPLICATE: Supabase user with email '{personal_email}' already exists")
                return Response(
                    {'success': False, 'error': f'Email {personal_email} is already registered in system'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"✓ No duplicates found")

            # Step 5: Generate credentials
            temp_password = secrets.token_urlsafe(12)
            user_id = str(uuid.uuid4())

            print(f"\n🔐 Generated credentials:")
            print(f" User ID (Supabase): {user_id}")
            print(f" Temp Password: {temp_password[:8]}...")
            print(f" Login Email: {personal_email}")

            # Step 6: Create both records atomically
            try:
                with transaction.atomic():
                    print(f"\n📌 Starting transaction...")

                    # ✅ Create django.contrib.auth.User
                    django_user = User.objects.create_user(
                        username=personal_email,
                        email=personal_email,
                        password=temp_password,
                        first_name=name.split()[0] if name.split() else 'HR',
                        last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else 'Manager',
                        date_joined=timezone.now()
                    )

                    print(f" ✓ Django User created")
                    print(f" Username: {django_user.username}")
                    print(f" Email: {django_user.email}")

                    # ✅ Create UsersAppUser (Supabase users table)
                    hr_create_kwargs = {
                        'id': user_id,
                        'email': personal_email,
                        'name': name,
                        'role': 'hr',
                        'company_id': company.id,
                        'temp_password': True,
                        'profile_completed': False,
                        'is_active': True,
                        'status': 'active',
                        'employee_type': 'permanent',
                    }

                    allowed_field_names = {f.name for f in UsersAppUser._meta.fields}
                    filtered_kwargs = {
                        k: v for k, v in hr_create_kwargs.items()
                        if k in allowed_field_names and v is not None
                    }

                    hr_user = UsersAppUser.objects.create(**filtered_kwargs)
                    print(f" ✓ Supabase User created")
                    print(f" Email: {hr_user.email}")

                    # ✅ Hash password if supported
                    try:
                        if hasattr(hr_user, 'set_password'):
                            hr_user.set_password(temp_password)
                            hr_user.save()
                            print(f" ✓ Password hashed and saved")
                    except Exception as e:
                        logger.debug(f"Could not hash password on Supabase user: {e}")

                    print(f"✓ Transaction committed successfully")

            except IntegrityError as ie:
                error_str = str(ie)
                print(f"❌ INTEGRITY ERROR: {error_str}")
                logger.exception("IntegrityError when creating HR user: %s", ie)

                if 'duplicate' in error_str or 'unique constraint' in error_str:
                    return Response({
                        'success': False,
                        'error': 'Email already exists. Please use a different email address.',
                        'detail': error_str
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'success': False,
                        'error': 'Failed to create user due to database constraint violation.',
                        'detail': error_str
                    }, status=status.HTTP_400_BAD_REQUEST)

            except Exception as exc:
                print(f"❌ UNEXPECTED ERROR: {str(exc)}")
                logger.exception("Unexpected error when creating HR user: %s", exc)
                return Response(
                    {'success': False, 'error': f'Failed to create HR user: {str(exc)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Step 7: Send invitation email
            try:
                print(f"\n📧 Sending invitation email to {personal_email}...")
                CompanyEmailService.send_hr_invitation(
                    personal_email=personal_email,
                    company_name=company.name,
                    hr_email=personal_email,
                    temp_password=temp_password
                )
                print(f"✓ Email sent successfully")
                email_sent = True
            except Exception as e:
                print(f"⚠️ Email sending failed: {str(e)}")
                logger.exception("Email sending failed for %s: %s", personal_email, e)
                email_sent = False

            # Step 8: Return success response
            print(f"\n✅ HR MANAGER ADDED SUCCESSFULLY")
            print(f" Login with: {personal_email}")
            print("="*80 + "\n")

            response_message = f'HR Manager {name} created successfully. Check {personal_email} for login credentials.'
            if not email_sent:
                response_message += ' (Note: Email delivery failed)'

            return Response({
                'success': True,
                'message': response_message,
                'data': {
                    'id': user_id,
                    'name': name,
                    'email': personal_email,
                    'role': 'hr',
                    'company_id': str(company.id),
                    'company_name': company.name,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
            logger.exception("Failed to add HR Manager: %s", e)
            return Response(
                {'success': False, 'error': f'Failed to add HR Manager: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='add_manager')
    def add_manager(self, request):
        """
        Add Manager / HR / Employee from Admin (after setup)
        - Accepts: name, email, role
        - Creates Django auth.User
        - Creates UsersAppUser with that role
        """
        try:
            print("\n" + "=" * 80)
            print("➕ ADD MANAGER / HR / EMPLOYEE")
            print("=" * 80)

            # Get company admin
            try:
                company_admin = CompanyAdmin.objects.get(user=request.user)
                company = company_admin.company
                print(f" ✓ CompanyAdmin found: {company_admin.full_name}")
                print(f" ✓ Company: {company.name}")
            except CompanyAdmin.DoesNotExist:
                print(f" ✗ CompanyAdmin NOT found")
                return Response(
                    {'success': False, 'error': 'Company admin not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get and validate input
            name = (request.data.get('name') or "").strip()
            email = (request.data.get('email') or "").strip().lower()
            role = (request.data.get('role') or "").strip().lower()

            print("RAW BODY:", request.data)
            print(f"\n📝 Input: name='{name}', email='{email}', role='{role}'")

            # Validation
            if not name or not email or not role:
                return Response(
                    {'success': False, 'error': 'Name, email, and role are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate role
            valid_roles = ['manager', 'hr', 'employee']
            if role not in valid_roles:
                return Response(
                    {'success': False, 'error': f'Invalid role. Use {", ".join(valid_roles)}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Email format validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, email):
                return Response(
                    {'success': False, 'error': 'Invalid email format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for duplicates
            if User.objects.filter(username=email).exists():
                return Response(
                    {'success': False, 'error': f'Email {email} is already registered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if UsersAppUser.objects.filter(email=email).exists():
                return Response(
                    {'success': False, 'error': f'Email {email} is already registered in system'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate credentials
            temp_password = secrets.token_urlsafe(12)
            user_id = str(uuid.uuid4())

            print(f"\n🔐 Generated: password={temp_password[:8]}..., id={user_id}")

            # Create users
            try:
                with transaction.atomic():
                    # Create Django user
                    django_user = User.objects.create_user(
                        username=email,
                        email=email,
                        password=temp_password,
                        first_name=name.split()[0] if name.split() else 'User',
                        last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
                        date_joined=timezone.now(),
                    )
                    print(f" ✓ Django User created")

                    # Create UsersAppUser
                    allowed_field_names = {f.name for f in UsersAppUser._meta.fields}
                    user_kwargs = {
                        'id': user_id,
                        'email': email,
                        'name': name,
                        'role': role,
                        'company_id': company.id,
                        'temp_password': True,
                        'profile_completed': False,
                        'is_active': True,
                        'status': 'active',
                        'employee_type': 'permanent',
                    }
                    filtered_kwargs = {
                        k: v for k, v in user_kwargs.items()
                        if k in allowed_field_names and v is not None
                    }

                    supabase_user = UsersAppUser.objects.create(**filtered_kwargs)
                    print(f" ✓ UsersAppUser created")

                    # Hash password if supported
                    if hasattr(supabase_user, "set_password"):
                        supabase_user.set_password(temp_password)
                        supabase_user.save()
                        print(f" ✓ Password hashed")

            except IntegrityError as ie:
                error_str = str(ie)
                print(f" ✗ IntegrityError: {error_str}")
                return Response(
                    {'success': False, 'error': f'Database constraint violation: {error_str}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            except Exception as exc:
                print(f" ✗ Transaction error: {str(exc)}")
                return Response(
                    {'success': False, 'error': f'Failed to create user: {str(exc)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Send email
            try:
                CompanyEmailService.send_hr_invitation(
                    personal_email=email,
                    company_name=company.name,
                    hr_email=email,
                    temp_password=temp_password,
                )
                email_sent = True
                print(f" ✓ Email sent")
            except Exception as e:
                print(f" ⚠️ Email failed: {str(e)}")
                email_sent = False

            print(f"\n✅ OPERATION COMPLETED SUCCESSFULLY")
            print("=" * 80 + "\n")

            message = f"User {name} created successfully as {role}."
            if not email_sent:
                message += " (Note: Email delivery failed)"

            return Response({
                'success': True,
                'message': message,
                'data': {
                    'id': user_id,
                    'name': name,
                    'email': email,
                    'role': role,
                    'company_id': str(company.id),
                    'company_name': company.name,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {str(e)}")
            logger.exception("Failed to add user: %s", e)
            return Response(
                {'success': False, 'error': f'Failed to add user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get', 'put'], url_path='appearance')
    def appearance(self, request):
        """Appearance settings endpoint"""
        user = request.user
        try:
            admin = CompanyAdmin.objects.get(user=user)
        except CompanyAdmin.DoesNotExist:
            return Response({'success': False, 'error': 'Admin profile not found'},
                          status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            return Response({
                'success': True,
                'data': {
                    'theme': 'system',
                    'language': 'en',
                    'timezone': admin.timezone,
                }
            })

        theme = request.data.get('theme', 'system')
        language = request.data.get('language', 'en')
        tz_choice = request.data.get('timezone', admin.timezone)

        admin.timezone = tz_choice
        admin.save()

        return Response({
            'success': True,
            'message': 'Appearance settings updated successfully',
            'data': {
                'theme': theme,
                'language': language,
                'timezone': tz_choice,
            }
        })

# ============================================
# ADMIN DASHBOARD VIEWSET
# ============================================

class AdminDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for admin dashboard operations
    Endpoints:
    - GET /api/admin/profile/
    - PUT /api/admin/profile/
    - POST /api/admin/avatar/
    - GET /api/admin/notifications/
    - PUT /api/admin/notifications/
    - GET /api/admin/sessions/
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'put'], url_path='profile')
    def profile(self, request):
        user = request.user
        try:
            admin = CompanyAdmin.objects.get(user=user)
        except CompanyAdmin.DoesNotExist:
            return Response({'success': False, 'error': 'Admin profile not found'},
                          status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            return Response({
                'success': True,
                'data': {
                    'full_name': admin.full_name,
                    'email': user.email,
                    'phone': admin.phone or '',
                    'company_name': admin.company_name or admin.company.name,
                    'company_website': admin.company_website or '',
                    'company_industry': admin.company_industry or '',
                    'total_employees': admin.total_employees,
                    'timezone': admin.timezone,
                    'currency': admin.currency,
                    'working_hours_start': str(admin.working_hours_start),
                    'working_hours_end': str(admin.working_hours_end),
                    'casual_leave_days': admin.casual_leave_days,
                    'sick_leave_days': admin.sick_leave_days,
                    'personal_leave_days': admin.personal_leave_days,
                }
            })

        # PUT - Update all fields
        data = request.data
        if 'full_name' in data:
            admin.full_name = data['full_name']
            user.first_name = data['full_name'].split()[0] if data['full_name'] else ''
            user.save()

        if 'phone' in data:
            admin.phone = data['phone']

        if 'company_name' in data:
            admin.company_name = data['company_name']
            admin.company.name = data['company_name']
            admin.company.save()

        if 'company_website' in data:
            admin.company_website = data['company_website']

        if 'company_industry' in data:
            admin.company_industry = data['company_industry']

        if 'total_employees' in data:
            admin.total_employees = int(data['total_employees'] or 0)

        if 'timezone' in data:
            admin.timezone = data['timezone']

        if 'currency' in data:
            admin.currency = data['currency']

        if 'working_hours_start' in data:
            admin.working_hours_start = data['working_hours_start']

        if 'working_hours_end' in data:
            admin.working_hours_end = data['working_hours_end']

        if 'casual_leave_days' in data:
            admin.casual_leave_days = int(data['casual_leave_days'] or 0)

        if 'sick_leave_days' in data:
            admin.sick_leave_days = int(data['sick_leave_days'] or 0)

        if 'personal_leave_days' in data:
            admin.personal_leave_days = int(data['personal_leave_days'] or 0)

        admin.save()

        return Response({
            'success': True,
            'message': 'Profile updated successfully'
        })

    @action(detail=False, methods=['post'], url_path='avatar')
    def avatar(self, request):
        user = request.user
        try:
            admin = CompanyAdmin.objects.get(user=user)
        except CompanyAdmin.DoesNotExist:
            return Response({'success': False, 'error': 'Admin profile not found'},
                          status=status.HTTP_404_NOT_FOUND)

        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response({'success': False, 'error': 'No avatar file provided'},
                          status=status.HTTP_400_BAD_REQUEST)

        if avatar_file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File size exceeds 5MB limit'},
                          status=status.HTTP_400_BAD_REQUEST)

        admin.avatar = avatar_file
        admin.save()

        return Response({
            'success': True,
            'message': 'Avatar uploaded successfully',
            'data': {'avatar_url': admin.avatar.url if admin.avatar else None}
        })

    @action(detail=False, methods=['get', 'put'], url_path='notifications')
    def notifications(self, request):
        if request.method == 'GET':
            return Response({
                'success': True,
                'data': {
                    'email_notifications': True,
                    'push_notifications': True,
                    'sms_notifications': False,
                    'leave_approvals': True,
                    'task_assignments': True,
                    'payroll_updates': True,
                }
            })

        data = {
            'email_notifications': request.data.get('email_notifications', True),
            'push_notifications': request.data.get('push_notifications', True),
            'sms_notifications': request.data.get('sms_notifications', False),
            'leave_approvals': request.data.get('leave_approvals', True),
            'task_assignments': request.data.get('task_assignments', True),
            'payroll_updates': request.data.get('payroll_updates', True),
        }

        return Response({
            'success': True,
            'message': 'Notification settings updated successfully',
            'data': data
        })

    @action(detail=False, methods=['get'], url_path='sessions')
    def sessions(self, request):
        return Response({
            'success': True,
            'data': [{
                'id': '1',
                'browser': 'Chrome',
                'device': 'Windows',
                'location': 'New York, US',
                'ip_address': '192.168.1.1',
                'last_active': 'Just now',
                'is_current': True,
            }]
        })