from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message, TeamMembership, Team
from .serializers import RoomSerializer, MessageSerializer
from django.contrib.auth.models import User


def user_is_admin(user):
    return user.is_superuser or getattr(user, 'is_staff', False)


def user_is_team_manager(user, team: Team):
    return TeamMembership.objects.filter(team=team, user=user, role='manager').exists()


def user_is_team_member(user, team: Team):
    return TeamMembership.objects.filter(team=team, user=user).exists()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def rooms_list(request):
    try:
        user = request.user
        print(f"DEBUG: Fetching rooms for user {user}")
        
        # Get all company rooms (accessible to all authenticated users)
        company_rooms = ChatRoom.objects.filter(room_type='company')
        print(f"DEBUG: Company rooms: {company_rooms.count()}")
        
        # Get user's team memberships
        team_memberships = TeamMembership.objects.filter(user=user)
        print(f"DEBUG: User team memberships: {team_memberships.count()}")
        
        # Get team IDs
        team_ids = team_memberships.values_list('team_id', flat=True)
        print(f"DEBUG: Team IDs: {list(team_ids)}")
        
        # Get team rooms
        if team_ids:
            team_rooms = ChatRoom.objects.filter(room_type='team', team_id__in=list(team_ids))
        else:
            team_rooms = ChatRoom.objects.none()
        
        print(f"DEBUG: Team rooms: {team_rooms.count()}")
        
        # Combine using union
        rooms = list(company_rooms) + list(team_rooms)
        rooms = sorted(set(rooms), key=lambda x: x.created_at)
        
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        print(f"ERROR in rooms_list: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def room_messages(request, room_id):
    try:
        user = request.user
        limit = min(int(request.GET.get('limit', 50)), 500)
        before = request.GET.get('before', None)
        
        room = get_object_or_404(ChatRoom, id=room_id)
        
        if room.room_type == 'company':
            pass
        else:
            if not (user_is_team_member(user, room.team) or user_is_admin(user)):
                return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
        qs = Message.objects.filter(room=room)
        if before:
            qs = qs.filter(created_at__lt=before)
        
        qs = qs.order_by('-created_at')[:limit]
        msgs = list(qs)[::-1]
        
        serializer = MessageSerializer(msgs, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        print(f"ERROR in room_messages: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def post_message(request, room_id):
    try:
        user = request.user
        room = get_object_or_404(ChatRoom, id=room_id)
        
        if room.room_type == 'company':
            is_admin_global = user_is_admin(user)
            is_manager_anyteam = TeamMembership.objects.filter(user=user, role='manager').exists()
            if not (is_admin_global or is_manager_anyteam):
                return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
        else:
            if not (user_is_team_member(user, room.team) or user_is_admin(user)):
                return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        metadata = request.data.get('metadata', {}) or {}
        msg = Message.objects.create(room=room, sender=user, content=content, metadata=metadata)
        
        serializer = MessageSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"ERROR in post_message: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
