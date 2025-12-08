# companies/auth.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from .models import CompanyAdmin

User = get_user_model()

class CompanyAdminBackend(ModelBackend):
    """
    Custom backend for company admin authentication
    Uses company email (admin@company_code.com) for login
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Username is the company email (admin@company_code.com)
            user = User.objects.get(username=username)
            
            # Verify password
            if user.check_password(password) and self.user_can_authenticate(user):
                # Get company admin details
                company_admin = CompanyAdmin.objects.get(user=user)
                if company_admin.company.is_active:
                    return user
        except (User.DoesNotExist, CompanyAdmin.DoesNotExist):
            pass
        
        return None
