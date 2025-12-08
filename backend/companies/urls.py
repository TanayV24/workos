# companies/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, AuthViewSet, AdminDashboardViewSet

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'admin', AdminDashboardViewSet, basename='admin')

urlpatterns = [
    path('api/', include(router.urls)),
]
