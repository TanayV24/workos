# workos/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

# Import viewsets from companies
try:
    from companies.views import CompanyViewSet, AuthViewSet, AdminDashboardViewSet
    HAS_COMPANIES = True
except ImportError:
    HAS_COMPANIES = False

# Create router
router = DefaultRouter()

# Register viewsets only if they exist
if HAS_COMPANIES:
    router.register(r'companies', CompanyViewSet, basename='companies')
    router.register(r'auth', AuthViewSet, basename='auth')
    router.register(r'admin', AdminDashboardViewSet, basename='admin')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # ⭐ Chat REST API routes
    path('api/chat/', include('chat.urls')),
    path('api/users/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
