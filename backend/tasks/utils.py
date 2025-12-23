# FILE 5: backend/tasks/utils.py - Permission Validators & Helpers

from typing import Optional, Tuple
import uuid
from .models import Task, TaskIntegrationSettings
from users.models import User
from companies.models import Department


class TaskPermissionValidator:
    """
    Validates task permissions based on user role and integration settings
    Used throughout views to check if user can perform task actions
    """
    
    def __init__(self, user: User, company_id: uuid.UUID):
        self.user = user
        self.company_id = company_id
        try:
            self.settings, _ = TaskIntegrationSettings.objects.get_or_create(
                company_id=company_id
            )
        except:
            self.settings = None
    
    def can_create_task(self) -> Tuple[bool, Optional[str]]:
        """Check if user can create new tasks"""
        if self.user.role == 'company_admin':
            return True, None
        
        if self.user.role == 'hr':
            return False, "HR cannot create tasks"
        
        if self.user.role == 'manager':
            return True, None
        
        if self.user.role == 'team_lead':
            return True, None
        
        if self.user.role == 'employee':
            if not self.settings or not self.settings.allow_employee_task_creation:
                return False, "Employee task creation disabled by admin"
            return True, None
        
        return False, "Unknown role"
    
    def can_assign_to_user(self, assignee: User) -> Tuple[bool, Optional[str]]:
        """Check if current user can assign task to another user"""
        if self.user.role == 'company_admin':
            return True, None
        
        if self.user.role == 'hr':
            return False, "HR cannot assign tasks"
        
        if self.user.role == 'manager':
            return True, None
        
        if self.user.role == 'team_lead':
            # Team leads can assign within their department or cross-dept if allowed
            if assignee.department_id != self.user.department_id:
                if not self.settings or not self.settings.allow_intra_department_assignments:
                    return False, "Cross-department assignment not allowed"
            return True, None
        
        if self.user.role == 'employee':
            if not self.settings or not self.settings.allow_employee_task_assignment:
                return False, "Employee task assignment disabled by admin"
            
            # Check department restrictions
            if assignee.department_id != self.user.department_id:
                if not self.settings.allow_intra_department_assignments:
                    return False, "Cross-department assignment not allowed"
            
            return True, None
        
        return False, "Unknown role"
    
    def can_update_status(self, task: Task) -> Tuple[bool, Optional[str]]:
        """Check if user can change task status"""
        if self.user.role in ['company_admin', 'manager']:
            return True, None
        
        if self.user.role == 'hr':
            return False, "HR cannot update tasks"
        
        if self.user.role == 'team_lead':
            if task.assigned_department_id == self.user.department_id or task.assigned_to == self.user.id:
                return True, None
            return False, "Can only update tasks in your department"
        
        if self.user.role == 'employee':
            if task.assigned_to == self.user.id:
                return True, None
            return False, "Can only update tasks assigned to you"
        
        return False, "Unknown role"
    
    def can_edit_timeline_priority(self) -> Tuple[bool, Optional[str]]:
        """Check if timeline/priority editing is enabled"""
        if self.user.role == 'company_admin':
            return True, None
        
        if not self.settings or not self.settings.allow_timeline_priority_editing:
            return False, "Timeline and priority editing disabled by admin"
        
        if self.user.role in ['manager']:
            return True, None
        
        if self.user.role == 'team_lead':
            return True, None  # They can edit within their department
        
        return False, f"Role '{self.user.role}' cannot edit timeline/priority"
    
    def get_cross_dept_redirection(self, assignee: User) -> Tuple[bool, Optional[uuid.UUID]]:
        """
        Check if cross-department assignment needs redirection
        Returns: (is_redirected, team_lead_id_if_redirected)
        """
        # Same department = no redirection needed
        if assignee.department_id == self.user.department_id:
            return False, None
        
        if not self.settings:
            return False, None
        
        # Check if redirection method is team_lead
        if self.settings.cross_department_task_redirection == 'team_lead':
            try:
                dept = Department.objects.get(id=assignee.department_id)
                if dept.head_id:
                    return True, dept.head_id
            except Department.DoesNotExist:
                pass
        
        return False, None