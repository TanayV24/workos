"""
workos URL Configuration

- Registers the DRF router for your viewsets
- Adds an explicit route for POST /api/auth/add_hr/ mapped to AuthViewSet.add_hr
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import your viewsets (these must match the names in companies/views.py)
# If import fails, double-check that `companies` is in INSTALLED_APPS and the module path is correct.
from companies.views import CompanyViewSet, AuthViewSet, AdminDashboardViewSet

# Create DRF router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'admin-dashboard', AdminDashboardViewSet, basename='admin-dashboard')

# Create an explicit view mapping for add_hr (guarantees the route exists)
# This maps POST /api/auth/add_hr/ directly to the add_hr action of AuthViewSet
add_hr_view = AuthViewSet.as_view({'post': 'add_hr'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),           # normal router (e.g. /api/auth/)
    path('api/auth/add_hr/', add_hr_view, name='add-hr-explicit'),  # explicit guaranteed route
]
