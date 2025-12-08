# companies/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import Company, CompanyAdmin, CompanyRegistrationToken
from .serializers import (
    CompanyRegisterSerializer,
    CompanyAdminCreateSerializer,
    CompanyAdminLoginSerializer,
    ChangePasswordSerializer,
    DashboardDataSerializer
)
from .email import CompanyEmailService
import uuid


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
        
        Request:
        POST /api/companies/register/
        {
            "name": "TechCorp India",
            "email": "contact@techcorp.com",
            "phone": "+91-9876543210",
            "website": "https://techcorp.com",
            "address": "123 Tech Street",
            "city": "Bangalore",
            "state": "Karnataka",
            "country": "India",
            "pincode": "560001",
            "timezone": "Asia/Kolkata",
            "currency": "INR"
        }
        
        Response:
        {
            "success": true,
            "data": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "TechCorp India",
                "code": "TECHCORP_INDIA",
                "email": "contact@techcorp.com",
                "registration_status": "pending"
            }
        }
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
# AUTH VIEWSET - Login, Admin Creation
# ============================================

class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for authentication operations
    
    Endpoints:
    - POST /api/auth/create-admin/
    - POST /api/auth/login/
    - POST /api/auth/change-temp-password/
    """
    
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def create_admin(self, request):
        """
        Create admin user and send credentials via email
        
        Request:
        POST /api/auth/create-admin/
        {
            "company_id": "550e8400-e29b-41d4-a716-446655440000",
            "full_name": "Rajesh Kumar",
            "personal_email": "rajesh@gmail.com",
            "phone": "+91-9876543210"
        }
        
        Response:
        {
            "success": true,
            "data": {
                "admin_id": "550e8401-e29b-41d4-a716-446655440001",
                "company_email": "admin@techcorp.com",
                "personal_email": "rajesh@gmail.com",
                "temp_password_sent": true,
                "password_expires_in": "72 hours"
            }
        }
        """
        
        serializer = CompanyAdminCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            result = serializer.save()
            
            return Response({
                'success': True,
                'data': result
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        Login with company email and password
        
        Request:
        POST /api/auth/login/
        {
            "email": "admin@techcorp.com",
            "password": "temp_password_from_email",
            "role": "admin"
        }
        
        Response:
        {
            "success": true,
            "data": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "user": {
                    "id": 1,
                    "email": "admin@techcorp.com",
                    "username": "admin@techcorp.com",
                    "temp_password": true
                }
            }
        }
        """
        
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'success': False,
                'error': 'Email and password required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check password
        if not user.check_password(password):
            return Response({
                'success': False,
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get CompanyAdmin to check if temp password
        try:
            admin = CompanyAdmin.objects.get(user=user)
            temp_password = admin.temp_password_set
        except CompanyAdmin.DoesNotExist:
            temp_password = False
        
        return Response({
            'success': True,
            'data': {
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'temp_password': temp_password
                }
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_temp_password(self, request):
        """
        Change temporary password to permanent one
        
        Request:
        POST /api/auth/change-temp-password/
        Headers: Authorization: Bearer <access_token>
        {
            "old_password": "temp_password_from_email",
            "new_password": "MyNewSecure@Pass123",
            "confirm_password": "MyNewSecure@Pass123"
        }
        
        Response:
        {
            "success": true,
            "message": "Password changed successfully"
        }
        """
        
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            # Verify old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'success': False,
                    'error': 'Old password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Update CompanyAdmin - temp_password_set = False
            try:
                admin = CompanyAdmin.objects.get(user=user)
                admin.temp_password_set = False
                admin.is_verified = True
                admin.save()
            except CompanyAdmin.DoesNotExist:
                pass
            
            return Response({
                'success': True,
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# ADMIN DASHBOARD VIEWSET
# ============================================

class AdminDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for admin dashboard operations
    
    Endpoints:
    - GET /api/admin/dashboard/
    """
    
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request):
        """
        Get admin dashboard data
        
        Request:
        GET /api/admin/dashboard/
        Headers: Authorization: Bearer <access_token>
        
        Response:
        {
            "success": true,
            "data": {
                "company": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "TechCorp India",
                    "setup_complete": false,
                    "setup_percentage": 40,
                    "registration_status": "pending"
                },
                "admin": {
                    "full_name": "Rajesh Kumar",
                    "personal_email": "rajesh@gmail.com",
                    "company_email": "admin@techcorp.com",
                    "temp_password": false,
                    "verified": true
                },
                "stats": {
                    "total_employees": 0,
                    "pending_approvals": 0
                }
            }
        }
        """
        
        user = request.user
        
        # Get CompanyAdmin
        try:
            admin = CompanyAdmin.objects.get(user=user)
        except CompanyAdmin.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Admin profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get Company
        company = admin.company
        
        # Prepare data
        data = {
            'company': company,
            'admin': admin
        }
        
        serializer = DashboardDataSerializer(data)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
