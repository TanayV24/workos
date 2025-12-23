from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
import uuid

from tasks.models import Task, TaskComment, TaskChecklist, TaskAttachment, TaskIntegrationSettings
from tasks.serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    TaskCommentSerializer,
    CreateTaskSerializer,
    UpdateTaskSerializer,
    TaskIntegrationSettingsSerializer,
)
from tasks.utils import TaskPermissionValidator
from notifications.utils import NotificationService
from users.models import User


class TaskListView(APIView):
    """List tasks (role-filtered)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            # Get filtered tasks based on role
            tasks = TaskPermissionValidator.get_filtered_tasks(user)
            
            # Apply pagination if needed
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            total_count = tasks.count()
            paginated_tasks = tasks[start_idx:end_idx]
            
            serializer = TaskListSerializer(paginated_tasks, many=True)
            
            return Response(
                {
                    'success': True,
                    'data': serializer.data,
                    'count': total_count,
                    'page': page,
                    'page_size': page_size,
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


class TaskCreateView(APIView):
    """Create a new task"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            # Check permission to create task
            TaskPermissionValidator.check_can_create_task(user, request.data.get('assigned_to'))
            
            # Get or create integration settings
            settings, _ = TaskIntegrationSettings.objects.get_or_create(company=user.company)
            
            # Validate based on settings
            TaskPermissionValidator.validate_creation(user, request.data, settings)
            
            # Create task
            task_id = uuid.uuid4()
            task = Task.objects.create(
                id=task_id,
                company=user.company,
                title=request.data.get('title'),
                description=request.data.get('description', ''),
                status='pending',
                priority=request.data.get('priority', 'medium'),
                assigned_to_id=request.data.get('assigned_to'),
                assigned_by=user,
                due_date=request.data.get('due_date'),
                progress_percentage=0,
                category=request.data.get('category'),
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            
            # Handle tags
            if 'tags' in request.data:
                task.tags = request.data['tags']
                task.save()
            
            # Create notification
            NotificationService.notify_task_assigned(task)
            
            serializer = TaskDetailSerializer(task)
            
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskDetailView(APIView):
    """Get task details"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(email=request.user.email)
            task = Task.objects.get(id=pk)
            
            # Check permission to view
            TaskPermissionValidator.check_can_view_task(user, task)
            
            serializer = TaskDetailSerializer(task)
            
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskUpdateView(APIView):
    """Update task (status, priority, timeline)"""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            user = User.objects.get(email=request.user.email)
            task = Task.objects.get(id=pk)
            
            # Check permission to update
            TaskPermissionValidator.check_can_update_task(user, task, request.data)
            
            # Update allowed fields
            if 'status' in request.data:
                old_status = task.status
                task.status = request.data['status']
                
                # Create notification if status changed
                if old_status != task.status:
                    NotificationService.notify_status_changed(task)
            
            if 'priority' in request.data:
                task.priority = request.data['priority']
                NotificationService.notify_priority_changed(task)
            
            if 'due_date' in request.data:
                task.due_date = request.data['due_date']
                NotificationService.notify_timeline_updated(task)
            
            if 'progress_percentage' in request.data:
                task.progress_percentage = int(request.data['progress_percentage'])
            
            task.updated_at = timezone.now()
            task.save()
            
            serializer = TaskDetailSerializer(task)
            
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskCommentView(APIView):
    """Add comment to task"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            task_id = request.data.get('task_id')
            content = request.data.get('content')
            
            if not task_id or not content:
                return Response(
                    {'success': False, 'error': 'task_id and content are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            task = Task.objects.get(id=task_id)
            
            # Check permission to comment
            TaskPermissionValidator.check_can_view_task(user, task)
            
            # Create comment
            comment = TaskComment.objects.create(
                id=uuid.uuid4(),
                task=task,
                content=content,
                posted_by=user,
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            
            # Create notification
            NotificationService.notify_comment_added(task, comment)
            
            serializer = TaskCommentSerializer(comment)
            
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        except User.DoesNotExist:
            return Response(
                {'success': False, 'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskIntegrationSettingsGetView(APIView):
    """Get integration settings (admin only)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            # Check if admin
            if user.role != 'company_admin':
                return Response(
                    {'success': False, 'error': 'Only admins can view settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get or create settings
            settings, _ = TaskIntegrationSettings.objects.get_or_create(company=user.company)
            
            serializer = TaskIntegrationSettingsSerializer(settings)
            
            return Response(
                {'success': True, 'data': serializer.data},
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


class TaskIntegrationSettingsUpdateView(APIView):
    """Update integration settings (admin only)"""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        try:
            user = User.objects.get(email=request.user.email)
            
            # Check if admin
            if user.role != 'company_admin':
                return Response(
                    {'success': False, 'error': 'Only admins can update settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get or create settings
            settings, _ = TaskIntegrationSettings.objects.get_or_create(company=user.company)
            
            # Update settings
            if 'allow_employee_task_creation' in request.data:
                settings.allow_employee_task_creation = request.data['allow_employee_task_creation']
            
            if 'allow_employee_task_assignment' in request.data:
                settings.allow_employee_task_assignment = request.data['allow_employee_task_assignment']
            
            if 'allow_intra_department_assignments' in request.data:
                settings.allow_intra_department_assignments = request.data['allow_intra_department_assignments']
            
            if 'allow_multi_task_assignment' in request.data:
                settings.allow_multi_task_assignment = request.data['allow_multi_task_assignment']
            
            if 'allow_timeline_priority_editing' in request.data:
                settings.allow_timeline_priority_editing = request.data['allow_timeline_priority_editing']
            
            if 'cross_department_task_redirection' in request.data:
                settings.cross_department_task_redirection = request.data['cross_department_task_redirection']
            
            settings.updated_by = user
            settings.updated_at = timezone.now()
            settings.save()
            
            serializer = TaskIntegrationSettingsSerializer(settings)
            
            return Response(
                {'success': True, 'data': serializer.data},
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