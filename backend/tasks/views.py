# backend/tasks/views.py - CORRECTED FOR YOUR DATABASE SCHEMA

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Max
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
from users.models import User as AppUser
from companies.models import CompanyAdmin


# ============================================
# HELPER FUNCTION - Get User with Role
# ============================================

def get_user_with_role(auth_user):
    """
    Get user object with role.
    Checks BOTH tables:
    - CompanyAdmin (for company_admin role)
    - AppUser / public.users (for hr, manager, team_lead, employee)
    """
    # Try CompanyAdmin first
    try:
        admin = CompanyAdmin.objects.get(user=auth_user)
        
        class AdminUserWrapper:
            def __init__(self, admin_obj, auth_user_obj):
                self.id = auth_user_obj.id
                self.email = auth_user_obj.email
                self.name = admin_obj.full_name
                self.role = 'company_admin'
                self.company_id = admin_obj.company.id
                self.department_id = None
                self.is_active = True
        
        return AdminUserWrapper(admin, auth_user)
    
    except CompanyAdmin.DoesNotExist:
        pass
    
    # Try AppUser (public.users)
    try:
        return AppUser.objects.get(email=auth_user.email)
    
    except AppUser.DoesNotExist:
        return None


# ============================================
# TaskListView
# ============================================

class TaskListView(APIView):
    """List tasks (role-filtered)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get filtered tasks based on role
            tasks = TaskPermissionValidator.get_filtered_tasks(user)
            
            # Apply pagination
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
        
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskCreateView
# ============================================

class TaskCreateView(APIView):
    """Create a new task"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate request data
            serializer = CreateTaskSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'success': False, 'error': 'Invalid data', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check permission to create task
            can_create, error_msg = TaskPermissionValidator.check_can_create_task(user)
            if not can_create:
                return Response(
                    {'success': False, 'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get assigned user
            assigned_to_id = request.data.get('assigned_to')
            try:
                assigned_to_user = AppUser.objects.get(id=assigned_to_id)
            except AppUser.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Assigned user not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check permission to assign
            can_assign, error_msg = TaskPermissionValidator.check_can_assign_to_user(user, assigned_to_user)
            if not can_assign:
                return Response(
                    {'success': False, 'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # CREATE TASK - ONLY fields that exist in public.tasks
            task = Task.objects.create(
                id=uuid.uuid4(),
                company_id=user.company_id,
                title=request.data.get('title'),
                description=request.data.get('description', ''),
                status='pending',
                priority=request.data.get('priority', 'medium'),
                assigned_to=assigned_to_user.id,
                assigned_by=user.id,
                due_date=request.data.get('due_date'),
                progress_percentage=0,
                category=request.data.get('category', ''),
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            
            # Handle tags
            if 'tags' in request.data:
                task.tags = request.data['tags']
                task.save()
            
            # Create notification
# Notification (method doesn't exist yet - will implement later)
# NotificationService.notify_task_assigned(task, assigned_to_user, user)
            
            detail_serializer = TaskDetailSerializer(task)
            return Response(
                {'success': True, 'data': detail_serializer.data},
                status=status.HTTP_201_CREATED
            )
        
        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            print("=" * 80)
            print("ERROR IN TaskCreateView:")
            print(traceback.format_exc())
            print("=" * 80)
            return Response(
                {'success': False, 'error': str(e), 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskDetailView
# ============================================

class TaskDetailView(APIView):
    """Get task details"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            task = Task.objects.get(id=pk)
            
            # Check permission to view
            can_view, error_msg = TaskPermissionValidator.check_can_view_task(user, task)
            if not can_view:
                return Response(
                    {'success': False, 'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = TaskDetailSerializer(task)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskUpdateView
# ============================================

class TaskUpdateView(APIView):
    """Update task"""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            task = Task.objects.get(id=pk)
            
            # Check permission to update
            can_update, error_msg = TaskPermissionValidator.check_can_update_task(user, task)
            if not can_update:
                return Response(
                    {'success': False, 'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check timeline/priority editing permission
            if 'due_date' in request.data or 'priority' in request.data:
                can_edit, error_msg = TaskPermissionValidator.check_can_edit_timeline_priority(user)
                if not can_edit:
                    return Response(
                        {'success': False, 'error': error_msg},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Update fields
            if 'title' in request.data:
                task.title = request.data['title']
            if 'description' in request.data:
                task.description = request.data['description']
            if 'status' in request.data:
                task.status = request.data['status']
            if 'priority' in request.data:
                task.priority = request.data['priority']
            if 'due_date' in request.data:
                task.due_date = request.data['due_date']
            if 'start_date' in request.data:
                task.start_date = request.data['start_date']
            if 'estimated_hours' in request.data:
                task.estimated_hours = request.data['estimated_hours']
            if 'actual_hours' in request.data:
                task.actual_hours = request.data['actual_hours']
            if 'progress_percentage' in request.data:
                task.progress_percentage = request.data['progress_percentage']
            if 'tags' in request.data:
                task.tags = request.data['tags']
            
            task.updated_at = timezone.now()
            task.save()
            
            # Send notification if status changed
            if 'status' in request.data:
# Notification (method doesn't exist yet - will implement later)
# NotificationService.notify_task_status_changed(task, user)
            
                serializer = TaskDetailSerializer(task)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskDeleteView
# ============================================

class TaskDeleteView(APIView):
    """Delete a task"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            task = Task.objects.get(id=pk)
            
            # Only creator, admin, or manager can delete
            if task.assigned_by != user.id and user.role not in ['company_admin', 'manager']:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            task.delete()
            return Response(
                {'success': True, 'message': 'Task deleted successfully'},
                status=status.HTTP_200_OK
            )
        
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskCommentCreateView - CORRECTED FIELD NAMES
# ============================================

class TaskCommentCreateView(APIView):
    """Add comment to task"""
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            task = Task.objects.get(id=task_id)
            
            # Check if user can comment
            can_comment, error_msg = TaskPermissionValidator.check_can_comment_task(user, task)
            if not can_comment:
                return Response(
                    {'success': False, 'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # CORRECTED: Use 'comment' and 'user_id' field names from actual DB
            comment = TaskComment.objects.create(
                id=uuid.uuid4(),
                task_id=task_id,
                comment=request.data.get('comment'),  # Changed from 'content' to 'comment'
                user_id=user.id,  # Changed from 'posted_by' to 'user_id'
                mentions=request.data.get('mentions', []),
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            
            serializer = TaskCommentSerializer(comment)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskChecklistCreateView - CORRECTED TABLE NAME
# ============================================

class TaskChecklistCreateView(APIView):
    """Add checklist item to task"""
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            task = Task.objects.get(id=task_id)
            
            # Get next order index
            max_index = TaskChecklist.objects.filter(task_id=task_id).aggregate(
                max_order=Max('order_index')
            )['max_order'] or 0
            
            # CORRECTED: Using 'task_id' directly since model uses manual FK
            checklist_item = TaskChecklist.objects.create(
                id=uuid.uuid4(),
                task_id=task_id,
                title=request.data.get('title'),
                description=request.data.get('description', ''),
                is_completed=False,
                order_index=max_index + 1,
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            
            from tasks.serializers import TaskChecklistSerializer
            serializer = TaskChecklistSerializer(checklist_item)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        
        except Task.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskIntegrationSettingsGetView
# ============================================

class TaskIntegrationSettingsGetView(APIView):
    """Get task integration settings (Admin only)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Admin only
            if user.role != 'company_admin':
                return Response(
                    {'success': False, 'error': 'Only admins can view settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            settings, _ = TaskIntegrationSettings.objects.get_or_create(
                company_id=user.company_id
            )
            serializer = TaskIntegrationSettingsSerializer(settings)
            
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskIntegrationSettingsUpdateView
# ============================================

class TaskIntegrationSettingsUpdateView(APIView):
    """Update task integration settings (Admin only)"""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Admin only
            if user.role != 'company_admin':
                return Response(
                    {'success': False, 'error': 'Only admins can update settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            settings, _ = TaskIntegrationSettings.objects.get_or_create(
                company_id=user.company_id
            )
            
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
            
            settings.updated_by = user.id
            settings.updated_at = timezone.now()
            settings.save()
            
            serializer = TaskIntegrationSettingsSerializer(settings)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# TaskIntegrationSettingsView (Combined GET/POST)
# ============================================

class TaskIntegrationSettingsView(APIView):
    """Get or update integration settings"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            settings, _ = TaskIntegrationSettings.objects.get_or_create(
                company_id=user.company_id
            )
            serializer = TaskIntegrationSettingsSerializer(settings)
            return Response(
                {'success': True, 'data': serializer.data},
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        try:
            auth_user = request.user
            user = get_user_with_role(auth_user)
            
            if not user:
                return Response(
                    {'success': False, 'error': 'User profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if user is admin
            if user.role != 'company_admin':
                return Response(
                    {'success': False, 'error': 'Only admins can update settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
                 
            settings, _ = TaskIntegrationSettings.objects.get_or_create(
                company_id=user.company_id
            )
            serializer = TaskIntegrationSettingsSerializer(
                settings,
                data=request.data,
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {'success': True, 'data': serializer.data},
                    status=status.HTTP_200_OK
                )
            
            return Response(
                {'success': False, 'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
