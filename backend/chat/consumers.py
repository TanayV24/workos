import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message, TeamMembership
from django.contrib.auth.models import AnonymousUser


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for chat rooms.
    Clients send JSON objects {action: 'join'|'leave'|'send_message'|'typing', payload: {...}}
    """

    async def connect(self):
        user = self.scope.get('user', None)
        if user is None or user == AnonymousUser():
            await self.close(code=4001)
            return
        
        await self.accept()
        self.user = user

    async def receive_json(self, content, **kwargs):
        action = content.get('action')
        payload = content.get('payload', {}) or {}
        
        if action == 'join':
            await self.join_room(payload.get('room_id'))
        elif action == 'leave':
            await self.leave_room(payload.get('room_id'))
        elif action == 'send_message':
            await self.handle_send_message(payload)
        elif action == 'typing':
            await self.handle_typing(payload)
        else:
            await self.send_json({'error': 'unknown_action'})

    async def join_room(self, room_id):
        can = await database_sync_to_async(self._can_access_room)(room_id)
        if not can:
            await self.send_json({'action': 'join', 'ok': False, 'error': 'forbidden'})
            return
        
        self.room_id = room_id
        self.group_name = f"chat_{room_id}"
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send_json({'action': 'join', 'ok': True})
        
        await self.channel_layer.group_send(self.group_name, {
            'type': 'user_joined',
            'user': {'id': str(self.user.id), 'username': self.user.username}
        })

    async def leave_room(self, room_id):
        group = f"chat_{room_id}"
        await self.channel_layer.group_discard(group, self.channel_name)
        await self.send_json({'action': 'leave', 'ok': True})
        
        await self.channel_layer.group_send(group, {
            'type': 'user_left',
            'user': {'id': str(self.user.id), 'username': self.user.username}
        })

    async def handle_send_message(self, payload):
        room_id = payload.get('room_id')
        content = (payload.get('content') or '').strip()
        metadata = payload.get('metadata', {}) or {}
        
        if not content:
            await self.send_json({'action': 'send_message', 'ok': False, 'error': 'empty'})
            return
        
        can_post = await database_sync_to_async(self._can_post_to_room)(room_id)
        if not can_post:
            await self.send_json({'action': 'send_message', 'ok': False, 'error': 'forbidden'})
            return
        
        msg = await database_sync_to_async(self._create_message)(room_id, self.user, content, metadata)
        group = f"chat_{room_id}"
        
        await self.channel_layer.group_send(group, {
            'type': 'new_message',
            'message': {
                'id': str(msg.id),
                'room': str(msg.room.id),
                'sender': {'id': str(self.user.id), 'username': self.user.username},
                'content': msg.content,
                'metadata': msg.metadata,
                'created_at': msg.created_at.isoformat()
            }
        })
        
        await self.send_json({'action': 'send_message', 'ok': True})

    async def handle_typing(self, payload):
        room_id = payload.get('room_id')
        is_typing = payload.get('is_typing', False)
        group = f"chat_{room_id}"
        
        await self.channel_layer.group_send(group, {
            'type': 'user_typing',
            'user': {'id': str(self.user.id), 'username': self.user.username},
            'is_typing': is_typing
        })

    async def new_message(self, event):
        await self.send_json({'action': 'new_message', 'payload': event['message']})

    async def user_joined(self, event):
        await self.send_json({'action': 'user_joined', 'payload': event.get('user')})

    async def user_left(self, event):
        await self.send_json({'action': 'user_left', 'payload': event.get('user')})

    async def user_typing(self, event):
        await self.send_json({
            'action': 'user_typing',
            'payload': {
                'user': event.get('user'),
                'is_typing': event.get('is_typing')
            }
        })

    def _can_access_room(self, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return False
        
        if room.room_type == 'company':
            return True
        
        if self.user.is_superuser or self.user.is_staff:
            return True
        
        return TeamMembership.objects.filter(team=room.team, user=self.user).exists()

    def _can_post_to_room(self, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return False
        
        if room.room_type == 'company':
            if self.user.is_superuser or self.user.is_staff:
                return True
            return TeamMembership.objects.filter(user=self.user, role='manager').exists()
        
        if self.user.is_superuser or self.user.is_staff:
            return True
        
            return TeamMembership.objects.filter(team=room.team, user=self.user).exists()

    def _create_message(self, room_id, user, content, metadata):
        room = ChatRoom.objects.get(id=room_id)
        return Message.objects.create(room=room, sender=user, content=content, metadata=metadata)
