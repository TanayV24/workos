from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from users.models import User


class NotificationListView(APIView):
    """List user's notifications"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            # Get all notifications for user, excluding deleted
            notifications = Notification.objects.filter(
                user=user,
                deleted_at__isnull=True
            ).order_by('-created_at')
            
            # Apply pagination if needed
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            paginated_notifications = notifications[start_idx:end_idx]
            serializer = NotificationSerializer(paginated_notifications, many=True)
            
            return Response(
                {
                    'success': True,
                    'data': serializer.data,
                    'count': notifications.count(),
                    'page': page,
                    'page_size': page_size,
                    'unread_count': notifications.filter(read=False).count()
                },
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationMarkReadView(APIView):
    """Mark specific notification as read"""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            user = User.objects.get(email=request.user.email)
            
            notification = Notification.objects.get(
                id=pk,
                user=user
            )
            
            notification.read = True
            notification.read_at = timezone.now()
            notification.save()
            
            serializer = NotificationSerializer(notification)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Notification.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationMarkAllReadView(APIView):
    """Mark all notifications as read for user"""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            unread_notifications = Notification.objects.filter(
                user=user,
                read=False,
                deleted_at__isnull=True
            )
            
            unread_notifications.update(
                read=True,
                read_at=timezone.now()
            )
            
            count = unread_notifications.count()
            
            return Response(
                {
                    'success': True,
                    'message': f'{count} notification{"s" if count != 1 else ""} marked as read'
                },
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationDeleteView(APIView):
    """Delete (soft delete) notification"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            user = User.objects.get(email=request.user.email)
            
            notification = Notification.objects.get(
                id=pk,
                user=user
            )
            
            notification.deleted_at = timezone.now()
            notification.save()
            
            return Response(
                {'success': True, 'message': 'Notification deleted'},
                status=status.HTTP_204_NO_CONTENT
            )
        
        except Notification.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationUnreadCountView(APIView):
    """Get count of unread notifications"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            unread_count = Notification.objects.filter(
                user=user,
                read=False,
                deleted_at__isnull=True
            ).count()
            
            return Response(
                {'success': True, 'unread_count': unread_count},
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationByTypeView(APIView):
    """Get notifications filtered by type"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            notification_type = request.query_params.get('type')
            
            if not notification_type:
                return Response(
                    {'success': False, 'error': 'Type parameter required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            notifications = Notification.objects.filter(
                user=user,
                type=notification_type,
                deleted_at__isnull=True
            ).order_by('-created_at')
            
            serializer = NotificationSerializer(notifications, many=True)
            
            return Response(
                {
                    'success': True,
                    'type': notification_type,
                    'data': serializer.data,
                    'count': notifications.count()
                },
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationUnreadView(APIView):
    """Get only unread notifications"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            notifications = Notification.objects.filter(
                user=user,
                read=False,
                deleted_at__isnull=True
            ).order_by('-created_at')
            
            serializer = NotificationSerializer(notifications, many=True)
            
            return Response(
                {
                    'success': True,
                    'data': serializer.data,
                    'count': notifications.count()
                },
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )