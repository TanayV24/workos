from rest_framework.routers import DefaultRouter
from .views import WhiteboardViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r"whiteboards", WhiteboardViewSet, basename="whiteboard")

urlpatterns = [
    path("api/whiteboard/", include(router.urls)),
]
