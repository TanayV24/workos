# FILE 9B: backend/notifications/utils.py - NotificationService

import uuid
from datetime import datetime
from .models import Notification
from users.models import User


class NotificationService:
    """
    Service class to handle all notification creation
    Called from task views when events occur
    """
    
    @staticmethod
    def create_task_assigned_notification(task, assignee_id: uuid.UUID, assigner_id: uuid.UUID, company_id: uuid.UUID):
        """
        Create notification when task is assigned
        Sends to: assignee and assigner
        """
        try:
            assigner = User.objects.get(id=assigner_id)
            assignee = User.objects.get(id=assignee_id)
            
            # Notification for assignee
            Notification.objects.create(
                id=uuid.uuid4(),
                user_id=assignee_id,
                company_id=company_id,
                type='task_assigned',
                title=f'New Task Assigned',
                message=f'{assigner.name} assigned you the task "{task.title}"',
                related_task_id=task.id,
                related_task_title=task.title,
                triggered_by=assigner_id
            )
            
            # Notification for assigner
            Notification.objects.create(
                id=uuid.uuid4(),
                user_id=assigner_id,
                company_id=company_id,
                type='task_assigned',
                title=f'Task Assigned',
                message=f'You assigned the task "{task.title}" to {assignee.name}',
                related_task_id=task.id,
                related_task_title=task.title,
                triggered_by=assigner_id
            )
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error creating task assigned notification: {e}")
    
    @staticmethod
    def create_status_changed_notification(task, old_status: str, new_status: str, changed_by_id: uuid.UUID, company_id: uuid.UUID):
        """
        Create notification when task status changes
        Sends to: assignee and assigner
        """
        try:
            changed_by = User.objects.get(id=changed_by_id)
            
            old_status_display = dict(task.STATUS_CHOICES).get(old_status, old_status)
            new_status_display = dict(task.STATUS_CHOICES).get(new_status, new_status)
            
            # Notification for assigner (who needs to know status changed)
            if task.assigned_by != changed_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_by,
                    company_id=company_id,
                    type='status_changed',
                    title=f'Task Status Updated',
                    message=f'Task "{task.title}" status changed from {old_status_display} to {new_status_display} by {changed_by.name}',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=changed_by_id
                )
            
            # Notification for assignee if not the one who changed it
            if task.assigned_to != changed_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_to,
                    company_id=company_id,
                    type='status_changed',
                    title=f'Your Task Status Changed',
                    message=f'Task "{task.title}" status changed to {new_status_display} by {changed_by.name}',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=changed_by_id
                )
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error creating status changed notification: {e}")
    
    @staticmethod
    def create_timeline_updated_notification(task, old_due_date: str, new_due_date: str, updated_by_id: uuid.UUID, company_id: uuid.UUID):
        """
        Create notification when task timeline/due_date changes
        Sends to: assignee and assigner
        """
        try:
            updated_by = User.objects.get(id=updated_by_id)
            
            # Notification for assignee
            Notification.objects.create(
                id=uuid.uuid4(),
                user_id=task.assigned_to,
                company_id=company_id,
                type='timeline_updated',
                title=f'Task Deadline Updated',
                message=f'Task "{task.title}" deadline changed from {old_due_date} to {new_due_date} by {updated_by.name}',
                related_task_id=task.id,
                related_task_title=task.title,
                triggered_by=updated_by_id
            )
            
            # Notification for assigner if not the one who updated
            if task.assigned_by != updated_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_by,
                    company_id=company_id,
                    type='timeline_updated',
                    title=f'Task Deadline Updated',
                    message=f'Task "{task.title}" deadline changed from {old_due_date} to {new_due_date}',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=updated_by_id
                )
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error creating timeline updated notification: {e}")
    
    @staticmethod
    def create_priority_updated_notification(task, old_priority: str, new_priority: str, updated_by_id: uuid.UUID, company_id: uuid.UUID):
        """
        Create notification when task priority changes
        Sends to: assignee and assigner
        """
        try:
            updated_by = User.objects.get(id=updated_by_id)
            
            old_priority_display = dict(task.PRIORITY_CHOICES).get(old_priority, old_priority)
            new_priority_display = dict(task.PRIORITY_CHOICES).get(new_priority, new_priority)
            
            # Notification for assignee
            Notification.objects.create(
                id=uuid.uuid4(),
                user_id=task.assigned_to,
                company_id=company_id,
                type='priority_updated',
                title=f'Task Priority Updated',
                message=f'Task "{task.title}" priority changed from {old_priority_display} to {new_priority_display} by {updated_by.name}',
                related_task_id=task.id,
                related_task_title=task.title,
                triggered_by=updated_by_id
            )
            
            # Notification for assigner if not the one who updated
            if task.assigned_by != updated_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_by,
                    company_id=company_id,
                    type='priority_updated',
                    title=f'Task Priority Updated',
                    message=f'Task "{task.title}" priority changed to {new_priority_display}',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=updated_by_id
                )
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error creating priority updated notification: {e}")
    
    @staticmethod
    def create_comment_added_notification(task, comment_id: uuid.UUID, commented_by_id: uuid.UUID, company_id: uuid.UUID):
        """
        Create notification when comment is added to task
        Sends to: assignee, assigner, and other commenters (except commenter)
        """
        try:
            commented_by = User.objects.get(id=commented_by_id)
            
            # Notification for assignee if not the commenter
            if task.assigned_to != commented_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_to,
                    company_id=company_id,
                    type='comment_added',
                    title=f'Comment Added',
                    message=f'{commented_by.name} commented on task "{task.title}"',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=commented_by_id
                )
            
            # Notification for assigner if not the commenter
            if task.assigned_by != commented_by_id:
                Notification.objects.create(
                    id=uuid.uuid4(),
                    user_id=task.assigned_by,
                    company_id=company_id,
                    type='comment_added',
                    title=f'Comment Added',
                    message=f'{commented_by.name} commented on task "{task.title}"',
                    related_task_id=task.id,
                    related_task_title=task.title,
                    triggered_by=commented_by_id
                )
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error creating comment added notification: {e}")