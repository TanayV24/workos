from rest_framework import serializers
from .models import Whiteboard

class WhiteboardSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source="owner.username")
    class Meta:
        model = Whiteboard
        fields = ["id", "title", "owner", "owner_username", "canvas_json", "is_public", "created_at", "updated_at"]
        read_only_fields = ["owner", "created_at", "updated_at"]
