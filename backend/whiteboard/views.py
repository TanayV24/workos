from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions
from .models import Whiteboard
from .serializers import WhiteboardSerializer
from rest_framework.response import Response
from rest_framework.decorators import action

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read: allow public or owner, Write: only owner or staff
        if request.method in permissions.SAFE_METHODS:
            return obj.is_public or obj.owner == request.user or request.user.is_staff
        return obj.owner == request.user or request.user.is_staff

class WhiteboardViewSet(viewsets.ModelViewSet):
    queryset = Whiteboard.objects.all().order_by("-updated_at")
    serializer_class = WhiteboardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        # staff sees all; regular users see their own + public boards
        user = self.request.user
        if user.is_staff:
            return super().get_queryset()
        return Whiteboard.objects.filter(models.Q(owner=user) | models.Q(is_public=True)).distinct()

    @action(detail=True, methods=["post"])
    def append_shape(self, request, pk=None):
        """
        Example helper to append a shape to the canvas_json.shapes list.
        Request body: {"shape": {...}}
        """
        board = self.get_object()
        self.check_object_permissions(request, board)
        shape = request.data.get("shape")
        if shape is None:
            return Response({"detail":"shape required"}, status=400)
        canvas = board.canvas_json or {}
        shapes = canvas.get("shapes", [])
        shapes.append(shape)
        canvas["shapes"] = shapes
        board.canvas_json = canvas
        board.save()
        return Response(self.get_serializer(board).data)
