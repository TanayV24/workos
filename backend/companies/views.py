# companies/views.py - COMPLETE WITH SEPARATE UsersViewSet

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from users.models import User as UsersAppUser
from .models import Company, CompanyAdmin, CompanyRegistrationToken
from .serializers import (
    CompanyRegisterSerializer,
    CompanyAdminCreateSerializer,
    CompanyAdminLoginSerializer,
    ChangePasswordSerializer,
    DashboardDataSerializer,
    CompanySetupSerializer
)
from .email import CompanyEmailService
import uuid
from django.utils import timezone

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
    - POST /api/auth/login/
    - POST /api/auth/change_temp_password/
    - POST /api/auth/company_setup/
    """

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        Login with company email and password
        """
        email = request.data.get('email')
        password = request.data.get('password')

        print("\n" + "="*80)
        print("🔐 LOGIN ATTEMPT")
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

        # Get CompanyAdmin to check if temp password
        print(f"\n👤 Fetching CompanyAdmin info...")
        try:
            admin = CompanyAdmin.objects.get(user=user)
            temp_password = admin.temp_password_set
            company_id = str(admin.company.id)
            company_name = admin.company.name
            full_name = admin.full_name
            company_setup_completed = admin.company_setup_completed
            print(f"✓ CompanyAdmin found")
        except CompanyAdmin.DoesNotExist:
            print(f"⚠️ CompanyAdmin NOT found for user")
            temp_password = False
            company_id = None
            company_name = "Unknown"
            full_name = user.first_name or user.username
            company_setup_completed = False

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
                    'role': 'company_admin'
                }
            }
        }

        print(f"\n✅ LOGIN SUCCESSFUL")
        print(f"User: {full_name} ({email})")
        print("="*80 + "\n")

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='change_temp_password')
    def change_temp_password(self, request):
        """
        Change temporary password to permanent password
        Path: /api/auth/change_temp_password/
        """
        print("\n" + "="*80)
        print("🔐 CHANGE TEMP PASSWORD")
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

        # Set new password
        print(f"\n✓ Setting new password...")
        user.set_password(new_password)
        user.save()
        print(f"✓ New password saved")

        # Update CompanyAdmin
        print(f"\n👤 Updating CompanyAdmin...")
        try:
            admin = CompanyAdmin.objects.get(user=user)
            admin.temp_password_set = False
            admin.password_changed_at = timezone.now()
            admin.save()
            print(f"✓ CompanyAdmin updated - temp_password_set = False")
        except CompanyAdmin.DoesNotExist:
            print(f"⚠️ CompanyAdmin NOT found")

        print("="*80 + "\n")

        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='company_setup')
    def company_setup(self, request):
        """
        Company first-time setup endpoint
        Path: /api/auth/company_setup/
        """
        try:
            user = request.user
            company_admin = CompanyAdmin.objects.get(user=user)

            print("\n" + "="*80)
            print("🏢 COMPANY SETUP")
            print(f"Admin: {company_admin.full_name}")
            print(f"Company: {company_admin.company.name}")
            print("="*80)

            # Check if already setup
            if company_admin.company_setup_completed:
                return Response({
                    'success': False,
                    'error': 'Company setup already completed'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Log received data
            print(f"\n📦 Received data: {request.data}")

            # Validate request data
            serializer = CompanySetupSerializer(data=request.data)
            if not serializer.is_valid():
                print(f"❌ Validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            validated_data = serializer.validated_data
            print(f"✓ Validated data: {validated_data}")

            # Get company
            company = company_admin.company

            # Update company info
            company.name = validated_data.get('company_name', company.name)
            company.website = validated_data.get('company_website', company.website or '')
            company.save()
            print(f"✓ Company updated: {company.name}")

            # Update company admin setup info
            company_admin.company_name = validated_data.get('company_name')
            company_admin.company_website = validated_data.get('company_website', '')
            company_admin.company_industry = validated_data.get('company_industry', '')
            company_admin.timezone = validated_data.get('timezone', 'IST')
            company_admin.currency = validated_data.get('currency', 'INR')
            company_admin.total_employees = validated_data.get('total_employees', 0)
            company_admin.working_hours_start = validated_data.get('working_hours_start', '09:00')
            company_admin.working_hours_end = validated_data.get('working_hours_end', '18:00')
            company_admin.casual_leave_days = validated_data.get('casual_leave_days', 12)
            company_admin.sick_leave_days = validated_data.get('sick_leave_days', 6)
            company_admin.personal_leave_days = validated_data.get('personal_leave_days', 2)

            # Mark setup as completed
            company_admin.company_setup_completed = True
            company_admin.setup_completed_at = timezone.now()
            company_admin.save()

            print(f"✓ Setup completed at: {company_admin.setup_completed_at}")
            print("="*80 + "\n")

            return Response({
                'success': True,
                'message': 'Company setup completed successfully'
            }, status=status.HTTP_200_OK)

        except CompanyAdmin.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Company admin not found'
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print(f"❌ Setup error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='add_hr')
    def add_hr(self, request):
        """
        Add HR Manager during company setup
        
        Path: /api/auth/add_hr/
        Method: POST
        Permissions: IsAuthenticated (Company Admin)
        
        Request body:
        {
            "name": "Zeel Patel",
            "email": "zeel@company.com"
        }
        
        Response:
        {
            "success": true,
            "message": "HR Manager Zeel Patel added successfully. Invitation sent to zeel@company.com",
            "data": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Zeel Patel",
                "email": "zeel@company.com",
                "company_email": "zeel.patel@company_code.com",
                "role": "hr_manager",
                "status": "invited",
                "temp_password": "aB3cDeFgHiJ..."
            }
        }
        """
        
        try:
            # ========== Step 1: Get company admin ==========
            try:
                company_admin = CompanyAdmin.objects.get(user=request.user)
                company = company_admin.company
            except CompanyAdmin.DoesNotExist:
                print(f"❌ Company admin not found")
                return Response({
                    'success': False,
                    'error': 'Company admin not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            print("\n" + "="*80)
            print("👤 ADD HR MANAGER")
            print(f"Company: {company.name}")
            print(f"Admin: {company_admin.full_name}")
            print("="*80)
            
            # ========== Step 2: Get and validate data ==========
            name = request.data.get('name', '').strip()
            email = request.data.get('email', '').strip().lower()
            
            print(f"\n📦 Request Data:")
            print(f"  Name: {name}")
            print(f"  Email: {email}")
            
            # Validate required fields
            if not name or not email:
                print(f"❌ Missing name or email")
                return Response({
                    'success': False,
                    'error': 'Name and email are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(name) < 2:
                print(f"❌ Name too short")
                return Response({
                    'success': False,
                    'error': 'Name must be at least 2 characters'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate email format
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, email):
                print(f"❌ Invalid email format")
                return Response({
                    'success': False,
                    'error': 'Invalid email format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== Step 3: Check for duplicates ==========
            print(f"\n🔍 Checking if email already exists...")
            
            # ✅ FIXED: Check using Django's User model (for auth)
            if User.objects.filter(email=email).exists():
                print(f"❌ Email already exists in system")
                return Response({
                    'success': False,
                    'error': 'This email already exists in the system'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ✅ FIXED: Also check in users.User model if they exist there
            if UsersAppUser.objects.filter(email=email).exists():
                print(f"❌ Email already exists in users system")
                return Response({
                    'success': False,
                    'error': 'This email already exists in the system'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"✓ Email is available")
            
            # ========== Step 4: Generate credentials ==========
            print(f"\n🔐 Generating credentials...")
            
            import secrets
            temp_password = secrets.token_urlsafe(12)
            
            # Generate company email for the manager
            manager_company_email = f"{name.lower().replace(' ', '.')}@{company.code.lower()}.com"
            
            print(f"  ✓ Temp password: {temp_password}")
            print(f"  ✓ Company email: {manager_company_email}")
            
            # ========== Step 5: Create Django User (for authentication) ==========
            print(f"\n👤 Creating Django user...")
            
            django_user = User.objects.create_user(
                username=manager_company_email,
                email=manager_company_email,
                password=temp_password,
                first_name=name.split()[0] if name.split() else 'HR',
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else 'Manager'
            )
            
            print(f"  ✓ Django user created: {django_user.username}")
            
            # ========== Step 6: Create users.User record ==========
            print(f"\n👤 Creating users.User record...")
            
            # ✅ FIXED: Using custom User model from users app
            hr_user = UsersAppUser.objects.create(
                id=django_user.id,  # Link to Django user
                email=email,  # Their personal email
                name=name,
                role='hr_manager',  # ✅ SET ROLE
                company_id=company.id,
                temp_password=True,  # ✅ MARK AS TEMP
                profile_completed=False
            )
            
            # Set password using the custom method
            hr_user.set_password(temp_password)
            hr_user.save()
            
            print(f"  ✓ users.User record created")
            print(f"  ✓ Role set to: hr_manager")
            print(f"  ✓ Company ID: {company.id}")
            print(f"  ✓ Temp password marked: True")
            
            # ========== Step 7: Send invitation email ==========
            print(f"\n📧 Sending invitation email...")
            
            try:
                # ✅ FIXED: Using correct email method
                CompanyEmailService.send_manager_invitation(
                    personal_email=email,  # Send to personal email
                    company_name=company.name,
                    manager_email=manager_company_email,  # Tell them company email
                    temp_password=temp_password
                )
                print(f"  ✓ Invitation email sent to {email}")
            except Exception as e:
                print(f"  ⚠️ Email sending failed: {str(e)}")
                # Don't fail the request if email fails
            
            # ========== Step 8: Return success response ==========
            print(f"\n✅ HR MANAGER ADDED SUCCESSFULLY")
            print("="*80 + "\n")
            
            return Response({
                'success': True,
                'message': f'HR Manager {name} added successfully. Invitation sent to {email}',
                'data': {
                    'id': str(hr_user.id),
                    'name': name,
                    'email': email,  # Personal email
                    'company_email': manager_company_email,  # Company email
                    'role': 'hr_manager',
                    'status': 'invited',
                    'temp_password': temp_password
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"\n❌ Error adding HR Manager: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response({
                'success': False,
                'error': f'Failed to add HR Manager: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    - PUT /api/admin/appearance/
    """
    permission_classes = [IsAuthenticated]

    # PROFILE
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
                    'avatar': admin.avatar.url if getattr(admin, 'avatar', None) else None,
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

    # AVATAR
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

    # NOTIFICATIONS
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

    # SESSIONS
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

    # APPEARANCE
    @action(detail=False, methods=['put'], url_path='appearance')
    def appearance(self, request):
        user = request.user
        try:
            admin = CompanyAdmin.objects.get(user=user)
        except CompanyAdmin.DoesNotExist:
            return Response({'success': False, 'error': 'Admin profile not found'},
                          status=status.HTTP_404_NOT_FOUND)

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

