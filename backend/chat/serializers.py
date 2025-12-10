from rest_framework import serializers
from .models import ChatRoom, Message
from django.contrib.auth.models import User

class UserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name')

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ('id', 'room_type', 'team', 'name', 'created_by', 'created_at')

class MessageSerializer(serializers.ModelSerializer):
    sender = UserLiteSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'room', 'sender', 'content', 'metadata', 'created_at')
