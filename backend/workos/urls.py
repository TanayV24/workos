# workos/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from companies.views import CompanyViewSet, AuthViewSet, AdminDashboardViewSet

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'admin', AdminDashboardViewSet, basename='admin')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
