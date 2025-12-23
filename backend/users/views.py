from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import User
import logging
from django.db import transaction
from django.contrib.auth.models import User as DjangoUser
from companies.models import Department, CompanyAdmin
from .serializers import (
    AddDepartmentSerializer,
    AddEmployeeSerializer,
    DepartmentSerializer,
)
import secrets
import uuid

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ViewSet):
    """
    ViewSet for user profile management
    
    ✅ UNIFIED ENDPOINTS IN companies/views.py:
    - POST /api/auth/login/          (for ALL users)
    - POST /api/auth/change_temp_password/  (for ALL users)
    
    ✅ PROFILE COMPLETION ENDPOINT (only in this viewset):
    - POST /api/users/complete_profile/
    """
    permission_classes = [IsAuthenticated]

    # ============================================
    # COMPLETE PROFILE ENDPOINT
    # ============================================


    @action(detail=False, methods=['get'], url_path='get_user_details', permission_classes=[IsAuthenticated])
    def get_user_details(self, request):
        """Get current user details with department name"""
        try:
            # Get Django user
            django_user = request.user

            if not django_user or not django_user.is_authenticated:
                return Response(
                    {'success': False, 'error': 'User not authenticated'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Get custom user from users table
            try:
                custom_user = User.objects.get(email=django_user.email)
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get department name from department_id
            dept_name = 'Unassigned'
            if custom_user.department_id:
                try:
                    dept = Department.objects.get(id=custom_user.department_id)
                    dept_name = dept.name
                except Department.DoesNotExist:
                    dept_name = 'Unknown'

            # Build response
            user_data = {
                'id': str(custom_user.id),
                'email': custom_user.email,
                'full_name': getattr(custom_user, 'name', ''),
                'phone': getattr(custom_user, 'phone', ''),
                'role': getattr(custom_user, 'role', ''),
                'company_id': str(custom_user.company_id) if custom_user.company_id else None,
                'department_id': str(custom_user.department_id) if custom_user.department_id else None,
                'department': dept_name,  # ✅ Department NAME, not ID
                'designation': getattr(custom_user, 'designation', ''),
                'profile_completed': getattr(custom_user, 'profile_completed', False),
                'temp_password': getattr(custom_user, 'temp_password', False),
            }

            return Response(
                {'success': True, 'data': user_data},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @action(detail=False, methods=['post'], url_path='complete_profile')
    def complete_profile(self, request):
        """
        Complete user profile after password change
        Path: /api/users/complete_profile/
        
        For: HR/Manager/Employee users ONLY (after temp password change)
        """
        try:
            # ✅ Use request.user directly (already authenticated)
            user = request.user

            print(f"\n👤 PROFILE COMPLETION ATTEMPT")
            print(f"User: {user.email}")
            print(f"User ID: {user.id}")
            print(f"Request user authenticated: {request.user.is_authenticated}")

            if not user or not user.is_authenticated:
                print(f"❌ User not authenticated")
                return Response({
                    'success': False,
                    'error': 'User not authenticated'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Get custom user from users table
            try:
                custom_user = User.objects.get(email=user.email)
            except User.DoesNotExist:
                print(f"❌ User not found in users table")
                return Response({
                    'success': False,
                    'error': 'User profile not found in system'
                }, status=status.HTTP_404_NOT_FOUND)

            print(f"Current temp_password: {getattr(custom_user, 'temp_password', 'NOT SET')}")
            print(f"Current profile_completed: {getattr(custom_user, 'profile_completed', 'NOT SET')}")

            # Get all data from request
            full_name = request.data.get('full_name')
            phone = request.data.get('phone')
            designation = request.data.get('designation')
            department = request.data.get('department')
            gender = request.data.get('gender')
            date_of_birth = request.data.get('date_of_birth')
            address = request.data.get('address')
            city = request.data.get('city')
            state = request.data.get('state')
            country = request.data.get('country')
            pincode = request.data.get('pincode')
            marital_status = request.data.get('marital_status')
            bio = request.data.get('bio')

            # Validate required fields
            if not full_name or not designation:
                return Response({
                    'success': False,
                    'error': 'Full name and designation are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get department ID from department name
            company_id = None
            if hasattr(custom_user, 'company_id') and custom_user.company_id:
                company_id = custom_user.company_id
                print(f"✓ Company ID: {company_id}")
            else:
                print(f"⚠ No company_id found for user")

            department_id = None
            if department:
                try:
                    print(f"\n🔍 Looking for department: {department}")
                    if company_id:
                        print(f" Searching in company: {company_id}")
                        dept = Department.objects.get(name__iexact=department, company_id=company_id)
                    else:
                        print(f" Searching globally (no company_id)")
                        dept = Department.objects.get(name__iexact=department)
                    
                    department_id = dept.id
                    print(f"✓ Department found: {department} (ID: {department_id})")
                except Department.DoesNotExist:
                    print(f"⚠ Department not found: {department}")
                    print(f" This is OK - profile can be completed without department")
                    department_id = None

            # ✅ UPDATE ALL USER FIELDS
            print(f"\n📝 UPDATING USER FIELDS:")

            if phone:
                custom_user.phone = phone
                print(f" ✓ phone = {phone}")

            custom_user.name = full_name
            print(f" ✓ name = {full_name}")

            if designation:
                custom_user.designation = designation
                print(f" ✓ designation = {designation}")

            if department_id:
                custom_user.department_id = department_id
                print(f" ✓ department_id = {department_id}")

            # Optional fields
            if gender and hasattr(custom_user, 'gender'):
                custom_user.gender = gender
                print(f" ✓ gender = {gender}")

            if date_of_birth and hasattr(custom_user, 'date_of_birth'):
                custom_user.date_of_birth = date_of_birth
                print(f" ✓ date_of_birth = {date_of_birth}")

            if address and hasattr(custom_user, 'address'):
                custom_user.address = address
                print(f" ✓ address = {address}")

            if city and hasattr(custom_user, 'city'):
                custom_user.city = city
                print(f" ✓ city = {city}")

            if state and hasattr(custom_user, 'state'):
                custom_user.state = state
                print(f" ✓ state = {state}")

            if country and hasattr(custom_user, 'country'):
                custom_user.country = country
                print(f" ✓ country = {country}")

            if pincode and hasattr(custom_user, 'pincode'):
                custom_user.pincode = pincode
                print(f" ✓ pincode = {pincode}")

            if marital_status and hasattr(custom_user, 'marital_status'):
                custom_user.marital_status = marital_status
                print(f" ✓ marital_status = {marital_status}")

            if bio and hasattr(custom_user, 'bio'):
                custom_user.bio = bio
                print(f" ✓ bio = {bio}")

            # Mark profile as completed
            custom_user.profile_completed = True
            print(f" ✓ profile_completed = TRUE")

            # Keep temp_password as False
            custom_user.temp_password = False
            print(f" ✓ temp_password = FALSE (maintained)")

            if hasattr(custom_user, 'profile_completed_at'):
                custom_user.profile_completed_at = timezone.now()
                print(f" ✓ profile_completed_at = NOW")

            # ✅ SAVE TO DATABASE
            print(f"\n✅ SAVING TO DATABASE...")
            custom_user.save()
            print(f"✓ Save completed")

            # ✅ Use in-memory user object for response (NO fresh DB lookup)
            print(f"\n✅ BUILDING RESPONSE FROM IN-MEMORY USER:")

            user_data = {
                'id': str(custom_user.id),
                'email': custom_user.email,
                'full_name': getattr(custom_user, 'name', ''),
                'phone': getattr(custom_user, 'phone', ''),
                'role': getattr(custom_user, 'role', ''),
                'company_id': getattr(custom_user, 'company_id', None),
                'department_id': str(department_id) if department_id else None,
                'designation': getattr(custom_user, 'designation', ''),
                'profile_completed': getattr(custom_user, 'profile_completed', False),
                'temp_password': getattr(custom_user, 'temp_password', False),
            }

            print(f" ✓ id = {user_data['id']}")
            print(f" ✓ email = {user_data['email']}")
            print(f" ✓ name = {user_data['full_name']}")
            print(f" ✓ phone = {user_data['phone']}")
            print(f" ✓ designation = {user_data['designation']}")
            print(f" ✓ profile_completed = {user_data['profile_completed']}")

            print(f"\n✅ PROFILE COMPLETED SUCCESSFULLY")
            print(f"User: {user_data['full_name']} ({user_data['email']})")
            print("="*80 + "\n")

            return Response({
                'success': True,
                'data': {'user': user_data}
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # ============================================
    # DEPARTMENT AND EMPLOYEE MANAGEMENT ENDPOINTS
    # ============================================

    @action(detail=False, methods=['post'], url_path='add_department')
    def add_department(self, request):
        """Create new department"""
        try:
            try:
                company_admin = CompanyAdmin.objects.get(user=request.user)
                company = company_admin.company
                
            except CompanyAdmin.DoesNotExist:
                return Response({'success': False, 'error': 'Company admin not found'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            serializer = AddDepartmentSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({'success': False, 'errors': serializer.errors}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data

            # ✅ Step 3: Check for duplicate code in this company
            if Department.objects.filter(
                company_id=company.id, 
                code=validated_data['code'].upper()  # Case-insensitive check
            ).exists():
                return Response(
                    {'success': False, 'error': f"Code '{validated_data['code']}' already exists in this company"},
                    status=status.HTTP_400_BAD_REQUEST)
            
            # Check for duplicate code
            if Department.objects.filter(company_id=company.id, code=validated_data['code']).exists():
                return Response({'success': False, 'error': f"Code {validated_data['code']} already exists"},
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Create department
            department = Department.objects.create(
                id=uuid.uuid4(),
                company_id=company.id,
                name=validated_data['name'],
                code=validated_data['code'],
                description=validated_data['description'],
                created_at=timezone.now()
            )
            
            dept_serializer = DepartmentSerializer(department)
            return Response({'success': True, 'data': dept_serializer.data}, 
                          status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='list_departments', permission_classes=[IsAuthenticated])
    def list_departments(self, request):
        """List all departments for company - Works for all roles"""
        try:
            # Try to get current user from custom users table first
            try:
                current_user = User.objects.get(email=request.user.email)
                company_id = current_user.company_id
                current_user_role = current_user.role
                
            except User.DoesNotExist:
                # Fallback: Check if they're a company admin
                try:
                    company_admin = CompanyAdmin.objects.get(user=request.user)
                    company_id = company_admin.company.id
                    current_user_role = 'company_admin'
                except CompanyAdmin.DoesNotExist:
                    return Response(
                        {'success': False, 'error': 'User not found in system'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Permission check
            if current_user_role not in ['company_admin', 'hr', 'manager', 'team_lead']:
                return Response(
                    {'success': False, 'error': 'No permission to view departments'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate company_id
            if not company_id:
                return Response(
                    {'success': False, 'error': 'User not associated with company'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get departments
            departments = Department.objects.filter(company_id=company_id).order_by('name')
            serializer = DepartmentSerializer(departments, many=True)
            
            return Response(
                {
                    'success': True,
                    'data': serializer.data,
                    'count': departments.count()
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @action(detail=False, methods=['post'], url_path='add_employee')
    def add_employee(self, request):
        """
        ✅ Create new employee (works for Admin, HR, Manager)
        
        Accepts: name, email, phone, role, department, designation
        """
        try:
            print("\n" + "="*80)
            print("➕ ADD EMPLOYEE")
            print("="*80)
            
            # ========== GET REQUESTER'S INFO ==========
            
            user_role = 'unknown'
            company_id = None
            requester_name = 'Unknown'
            
            # Check if CompanyAdmin
            try:
                admin = CompanyAdmin.objects.get(user=request.user)
                user_role = 'company_admin'
                company_id = admin.company.id
                requester_name = admin.full_name
                print(f"✓ CompanyAdmin found: {requester_name}")
            except CompanyAdmin.DoesNotExist:
                # Check if HR/Manager in users table ← THIS IS THE FIX
                try:
                    custom_user = User.objects.get(email=request.user.email)
                    user_role = custom_user.role
                    company_id = custom_user.company_id
                    requester_name = custom_user.name
                    print(f"✓ User found in users table: {requester_name} (role: {user_role})")
                except User.DoesNotExist:
                    print("❌ User not found in either table")
                    return Response({
                        'success': False,
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # ========== CHECK PERMISSION ==========
            
            allowed_roles = ['company_admin', 'hr', 'manager']
            if user_role not in allowed_roles:
                print(f"❌ Permission denied for role: {user_role}")
                return Response({
                    'success': False,
                    'error': f'Only {", ".join(allowed_roles)} can create employees'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not company_id:
                print("❌ No company assigned")
                return Response({
                    'success': False,
                    'error': 'No company assigned to user'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== VALIDATE INPUT ==========
            
            name = (request.data.get('name') or '').strip()
            email = (request.data.get('email') or '').strip().lower()
            phone = (request.data.get('phone') or '').strip()
            role = (request.data.get('role') or 'employee').strip().lower()
            department = (request.data.get('department') or '').strip()  # ← Accept department NAME
            designation = (request.data.get('designation') or '').strip()
            
            print(f"\n📝 Input:")
            print(f" Name: {name}")
            print(f" Email: {email}")
            print(f" Role: {role}")
            print(f" Department: {department}")
            print(f" Designation: {designation}")
            
            if not name or not email:
                return Response({
                    'success': False,
                    'error': 'Name and email are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if role not in ['employee', 'manager', 'hr', 'team_lead']:  # ← FIXED: Changed from team_lead
                return Response({
                    'success': False,
                    'error': f'Invalid role. Use: employee, manager, hr'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== CHECK DUPLICATE ==========
            
            print(f"\n🔍 Checking duplicates...")

            if User.objects.filter(email=email).exists():
                print(f"❌ Email already exists in users table")
                return Response({
                    'success': False,
                    'error': f'Email {email} already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if DjangoUser.objects.filter(username=email).exists():
                print(f"❌ Email already exists in auth_user")
                return Response({
                    'success': False,
                    'error': f'Email {email} already registered'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"✓ No duplicates found")
            
            # ========== GET DEPARTMENT ID FROM DEPARTMENT NAME ==========
            
            department_id = None
            if department:
                print(f"\n🔍 Looking for department: {department}")
                try:
                    # ← THIS IS THE FIX: Accept department name, lookup ID
                    dept = Department.objects.get(name__iexact=department, company_id=company_id)
                    department_id = dept.id
                    print(f"✓ Department found: {dept.name} (ID: {department_id})")
                except Department.DoesNotExist:
                    print(f"❌ Department not found in company")
                    return Response({
                        'success': False,
                        'error': f'Department "{department}" not found in your company'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== CREATE EMPLOYEE ==========
            
            try:
                temp_password = secrets.token_urlsafe(12)
                employee_id = str(uuid.uuid4())
                
                print(f"\n📌 Creating employee...")
                
                with transaction.atomic():
                    # Create Django user
                    # ← THIS IS THE FIX: Proper first_name/last_name assignment
                    first_name = name.split()[0] if name.split() else 'Employee'
                    last_name = ' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
                    
                    django_user = DjangoUser.objects.create_user(
                        username=email,
                        email=email,
                        password=temp_password,
                        first_name=first_name,
                        last_name=last_name,
                        date_joined=timezone.now()
                    )
                    print(f"✓ Django user created: {django_user.username}")
                    
                    # Create custom user
                    user_record = User.objects.create(
                        id=employee_id,
                        email=email,
                        name=name,
                        phone=phone or None,
                        role=role,
                        company_id=company_id,
                        department_id=department_id,
                        temp_password=True,
                        profile_completed=False,
                        is_active=True,
                        status='active',
                        employee_type='permanent',
                        created_at=timezone.now()
                    )
                    print(f"✓ User record created: {user_record.email}")
                    
                    # If manager, optionally assign as department head
                    if role == 'manager' and department_id:
                        try:
                            dept = Department.objects.get(id=department_id)
                            dept.head_id = django_user.id
                            dept.save()
                            print(f"✓ Assigned as department head")
                        except Exception as e:
                            print(f"⚠️ Could not assign as head: {str(e)}")


                    if role == 'team_lead' and department_id:
                        try:
                            dept = Department.objects.get(id=department_id)
                            dept.head_id = user_record.id  # ✅ Links to public.user
                            dept.save()
                            print(f"✓ Assigned team_lead as department head")
                        except Exception as e:
                            print(f"⚠️ Could not assign as head: {str(e)}")

                    
                    # Send email (optional, don't break on failure)
                    try:
                        from django.core.mail import send_mail
                        send_mail(
                            f"WorkOS - Account Created for {name}",
                            f"Hello {name},\n\nYour employee account has been created.\n\nEmail: {email}\nTemp Password: {temp_password}\n\nPlease login and change your password immediately.\n\nBest regards,\nWorkOS Team",
                            'noreply@workos.com',
                            [email],
                            fail_silently=False,
                        )
                        print(f"✓ Invitation email sent to {email}")
                    except Exception as email_err:
                        print(f"⚠️ Email failed: {str(email_err)}")
                    
                    print(f"\n✅ EMPLOYEE CREATED SUCCESSFULLY")
                    print("="*80 + "\n")
                    
                    return Response({
                        'success': True,
                        'message': f'Employee "{name}" created successfully',
                        'data': {
                            'id': str(user_record.id),
                            'name': user_record.name,
                            'email': user_record.email,
                            'role': user_record.role,
                            'department': department,
                            'department_id': str(user_record.department_id) if user_record.department_id else None,
                            'designation': designation,
                            'company_id': str(company_id),
                            'temp_password': temp_password[:8] + '...',
                        }
                    }, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                print(f"❌ Error creating employee: {str(e)}")
                logger.exception("Error creating employee: %s", e)
                return Response({
                    'success': False,
                    'error': f'Failed to create employee: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"❌ Outer error: {str(e)}")
            logger.exception("Add employee error: %s", e)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
   
    @action(detail=False, methods=['get'], url_path='list_employees', permission_classes=[IsAuthenticated])
    def list_employees(self, request):
        """List employees based on user role"""
        try:
            # Try to get current user from custom users table
            try:
                current_user = User.objects.get(email=request.user.email)
            except User.DoesNotExist:
                # If user not found, check if they're a company admin
                try:
                    company_admin = CompanyAdmin.objects.get(user=request.user)
                    company_id = company_admin.company.id
                    # Create a temporary admin context
                    current_user_role = 'company_admin'
                except CompanyAdmin.DoesNotExist:
                    return Response(
                        {'success': False, 'error': 'User not found in system'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                company_id = current_user.company_id
                current_user_role = current_user.role
            
            # Get company
            if not company_id:
                return Response(
                    {'success': False, 'error': 'User not associated with company'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Filter employees based on role
            if current_user_role in ['company_admin', 'hr', 'manager']:
                employees = User.objects.filter(
                    company_id=company_id
                ).order_by('-created_at')
            elif current_user_role == 'team_lead':
                if not hasattr(current_user, 'department_id'):
                    return Response(
                        {'success': False, 'error': 'Team lead not assigned to department'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                employees = User.objects.filter(
                    company_id=company_id,
                    department_id=current_user.department_id
                ).order_by('-created_at')
            else:
                return Response(
                    {'success': False, 'error': 'No permission to view employees'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Build response
            employee_list = []
            for emp in employees:
                dept_name = 'N/A'
                if emp.department_id:
                    try:
                        dept = Department.objects.get(id=emp.department_id)
                        dept_name = dept.name
                    except Department.DoesNotExist:
                        dept_name = 'Unknown'
                
                employee_data = {
                    'id': str(emp.id),
                    'name': emp.name,
                    'email': emp.email,
                    'role': emp.role,
                    'department': dept_name,
                    'department_id': str(emp.department_id) if emp.department_id else None,
                    'status': 'active' if not emp.temp_password else 'pending',
                    'phone': getattr(emp, 'phone', None),
                    'designation': getattr(emp, 'designation', None),
                    'location': getattr(emp, 'location', None),
                    'join_date': emp.created_at.strftime('%Y-%m-%d') if emp.created_at else None,
                }
                employee_list.append(employee_data)
            
            return Response(
                {
                    'success': True,
                    'data': employee_list,
                    'count': len(employee_list)
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='delete_employee')
    def delete_employee(self, request):
        """
        ✅ DELETE EMPLOYEE - Hard delete from both tables
        
        Permissions:
        - Company Admin: Can delete ANY employee
        - HR: Can delete ANY employee EXCEPT themselves
        - Manager/Team_lead/Employee: Cannot delete
        
        Deletes from:
        1. public."user" (custom user)
        2. public.auth_user (Django user)
        3. Cleans up if employee is department head
        """
        
        try:
            print("\n" + "="*80)
            print("🗑️ DELETE EMPLOYEE")
            print("="*80)
            
            # ========== GET REQUESTER INFO ==========
            
            requester_role = 'unknown'
            requester_email = request.user.email
            
            # Check if CompanyAdmin
            try:
                admin = CompanyAdmin.objects.get(user=request.user)
                requester_role = 'company_admin'
                company_id = admin.company.id
                print(f"✓ Requester: CompanyAdmin ({admin.full_name})")
            except CompanyAdmin.DoesNotExist:
                # Check if HR in users table
                try:
                    custom_user = User.objects.get(email=requester_email)
                    requester_role = custom_user.role
                    company_id = custom_user.company_id
                    print(f"✓ Requester: {requester_role} ({custom_user.name})")
                except User.DoesNotExist:
                    print("❌ Requester not found")
                    return Response({
                        'success': False,
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # ========== CHECK PERMISSION ==========
            
            allowed_roles = ['company_admin', 'hr']
            if requester_role not in allowed_roles:
                print(f"❌ Permission denied for role: {requester_role}")
                return Response({
                    'success': False,
                    'error': f'Only company admin and HR can delete employees'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # ========== GET EMPLOYEE TO DELETE ==========
            
            employee_id = request.data.get('employee_id')
            if not employee_id:
                return Response({
                    'success': False,
                    'error': 'employee_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"\n🔍 Looking for employee: {employee_id}")
            
            try:
                employee = User.objects.get(id=employee_id)
            except User.DoesNotExist:
                print(f"❌ Employee not found")
                return Response({
                    'success': False,
                    'error': 'Employee not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"✓ Employee found: {employee.name} ({employee.email})")
            
            # ========== PREVENT SELF-DELETION (HR only) ==========
            
            if requester_role == 'hr' and employee.email == requester_email:
                print(f"❌ HR cannot delete themselves")
                return Response({
                    'success': False,
                    'error': 'You cannot delete your own account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ========== COMPANY CHECK ==========
            
            if employee.company_id != company_id:
                print(f"❌ Employee belongs to different company")
                return Response({
                    'success': False,
                    'error': 'Cannot delete employee from another company'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # ========== CLEANUP DEPARTMENT HEAD ==========
            
            print(f"\n🔍 Checking if employee is department head...")
            
            from django.db.models import Q
            from companies.models import Department  # ✅ CORRECT
            
            try:
                departments = Department.objects.filter(head_id=employee_id)
                if departments.exists():
                    print(f"✓ Found {departments.count()} department(s) where this employee is head")
                    for dept in departments:
                        print(f"  - {dept.name}: Setting head_id to NULL")
                        dept.head_id = None
                        dept.save()
            except Exception as e:
                print(f"⚠️ Could not cleanup department heads: {str(e)}")
            
            # ========== DELETE EMPLOYEE ==========
            
            employee_name = employee.name
            employee_email = employee.email
            
            try:
                with transaction.atomic():
                    # Get Django user before deleting
                    try:
                        django_user = DjangoUser.objects.get(username=employee_email)
                        django_user_id = django_user.id
                    except DjangoUser.DoesNotExist:
                        django_user_id = None
                        print(f"⚠️ Django user not found for {employee_email}")
                    
                    # Delete from public."user"
                    print(f"\n📌 Deleting from public.\"user\"...")
                    deleted_count, _ = User.objects.filter(id=employee_id).delete()
                    print(f"✓ Deleted {deleted_count} record(s) from public.user")
                    
                    # Delete from public.auth_user
                    if django_user_id:
                        print(f"\n📌 Deleting from public.auth_user...")
                        auth_deleted_count, _ = DjangoUser.objects.filter(id=django_user_id).delete()
                        print(f"✓ Deleted {auth_deleted_count} record(s) from auth_user")
                    
                    print(f"\n✅ EMPLOYEE DELETED SUCCESSFULLY")
                    print(f"Name: {employee_name}")
                    print(f"Email: {employee_email}")
                    print("="*80 + "\n")
                    
                    return Response({
                        'success': True,
                        'message': f'Employee "{employee_name}" deleted successfully',
                        'data': {
                            'deleted_id': str(employee_id),
                            'deleted_name': employee_name,
                            'deleted_email': employee_email
                        }
                    }, status=status.HTTP_200_OK)
            
            except Exception as e:
                print(f"❌ Error during deletion: {str(e)}")
                logger.exception("Error deleting employee: %s", e)
                return Response({
                    'success': False,
                    'error': f'Failed to delete employee: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            print(f"❌ Outer error: {str(e)}")
            logger.exception("Delete employee error: %s", e)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

