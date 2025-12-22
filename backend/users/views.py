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
        """Create new employee"""
        try:
            try:
                company_admin = CompanyAdmin.objects.get(user=request.user)
                company = company_admin.company
            except CompanyAdmin.DoesNotExist:
                return Response({'success': False, 'error': 'Company admin not found'},
                              status=status.HTTP_404_NOT_FOUND)
            
            serializer = AddEmployeeSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({'success': False, 'errors': serializer.errors},
                              status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Validate department
            try:
                department = Department.objects.get(
                    id=validated_data['department_id'],
                    company_id=company.id
                )
            except Department.DoesNotExist:
                return Response({'success': False, 'error': 'Department not found'},
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Generate credentials
            temp_password = secrets.token_urlsafe(12)
            employee_id = str(uuid.uuid4())
            
            try:
                with transaction.atomic():
                    # Create Django auth_user
                    django_user = DjangoUser.objects.create_user(
                        username=validated_data['email'],
                        email=validated_data['email'],
                        first_name=validated_data['name'].split(),
                        password=temp_password
                    )
                    
                    # Create users app User
                    user_record = User.objects.create(
                        id=employee_id,
                        email=validated_data['email'],
                        name=validated_data['name'],
                        role=validated_data['role'],
                        company_id=company.id,
                        department_id=validated_data['department_id'],
                        temp_password=True,
                        profile_completed=False,
                        password_hash=django_user.password,
                        created_at=timezone.now()
                    )
                    
                    # If team_lead, assign as head
                    if validated_data['role'] == 'team_lead':
                        department.head_id = django_user.id
                        department.save()
                    
                    # Send email
                    try:
                        from django.core.mail import send_mail
                        send_mail(
                            "WorkOS - Your Employee Account Created",
                            f"Hello {validated_data['name']},\n\nEmail: {validated_data['email']}\nTemp Password: {temp_password}\n\nPlease login and change your password.",
                            'noreply@workos.com',
                            [validated_data['email']],
                            fail_silently=False,
                        )
                    except:
                        pass
                    
                    response_data = {
                        'id': str(user_record.id),
                        'name': user_record.name,
                        'email': user_record.email,
                        'role': user_record.role,
                        'department_id': str(user_record.department_id),
                        'department_name': department.name,
                        'company_id': str(user_record.company_id),
                    }
                    
                    return Response({
                        'success': True,
                        'message': f'Employee "{user_record.name}" created successfully',
                        'data': response_data
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'success': False, 'error': str(e)},
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'success': False, 'error': str(e)},
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
