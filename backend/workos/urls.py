# workos/backend/workos/urls.py
"""
Project URL configuration for WorkOS.

This file:
 - registers DRF router for the main app viewsets
 - keeps existing app includes (chat, users)
 - adds an explicit guaranteed endpoint for POST /api/auth/add_hr/
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
import logging

logger = logging.getLogger(__name__)

# Attempt to import the companies viewsets. If import fails, we still allow the server to start.
HAS_COMPANIES = False
CompanyViewSet = None
AuthViewSet = None
AdminDashboardViewSet = None

try:
    # adjust this import if your app name/path differs; this matches the app layout in the repo
    from companies.views import CompanyViewSet, AuthViewSet, AdminDashboardViewSet
    HAS_COMPANIES = True
except Exception as e:
    # Log the import problem so it's visible in startup logs
    logger.exception("Could not import companies viewsets: %s", e)
    HAS_COMPANIES = False

# Create router and register viewsets if available
router = DefaultRouter()

if HAS_COMPANIES and CompanyViewSet is not None:
    router.register(r'companies', CompanyViewSet, basename='companies')

if HAS_COMPANIES and AuthViewSet is not None:
    router.register(r'auth', AuthViewSet, basename='auth')

if HAS_COMPANIES and AdminDashboardViewSet is not None:
    router.register(r'admin', AdminDashboardViewSet, basename='admin')

# If for any reason the router did not register add_hr, create an explicit mapping below.
add_hr_view = None
if HAS_COMPANIES and AuthViewSet is not None:
    # map POST /api/auth/add_hr/ directly to the add_hr action of AuthViewSet
    try:
        add_hr_view = AuthViewSet.as_view({'post': 'add_hr'})
    except Exception:
        add_hr_view = None

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),          # router-registered routes (e.g. /api/auth/)
    # keep your other app routes
    path('api/chat/', include('chat.urls')),
    path('api/users/', include('users.urls')),
    path('', include(router.urls)),              # keep the router root for browsable api if desired
]

# Add the explicit add_hr endpoint only if we were able to create it
if add_hr_view is not None:
    urlpatterns += [
        path('api/auth/add_hr/', add_hr_view, name='add-hr-explicit'),
    ]
else:
    # if we couldn't construct the explicit view, log a warning so you can inspect the underlying import issues
    logger.warning("AuthViewSet.add_hr explicit route was NOT created because AuthViewSet is unavailable.")

# Serve media in debug
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
