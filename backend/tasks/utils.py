# backend/tasks/utils.py - FIXED AND COMPLETE

from typing import Optional, Tuple

import uuid

from django.db.models import Q

from .models import Task, TaskIntegrationSettings

from users.models import User

from companies.models import Department

class TaskPermissionValidator:

	"""

	Validates task permissions based on user role and integration settings

	Uses static methods for use throughout views

	"""

	@staticmethod

	def check_can_create_task(user: User) -> Tuple[bool, Optional[str]]:

		"""Check if user can create new tasks"""

		if user.role == 'company_admin':

			return True, None

		if user.role == 'hr':

			return False, "HR cannot create tasks"

		if user.role == 'manager':

			return True, None

		if user.role == 'team_lead':

			return True, None

		if user.role == 'employee':

			try:

				settings = TaskIntegrationSettings.objects.get(company_id=user.company_id)

				if not settings.allow_employee_task_creation:

					return False, "Employee task creation disabled by admin"

			except TaskIntegrationSettings.DoesNotExist:

				# Default to allow if settings don't exist

				pass

			return True, None

		return False, "Unknown role"

	@staticmethod

	def check_can_assign_to_user(user: User, assignee: User) -> Tuple[bool, Optional[str]]:

		"""Check if current user can assign task to another user"""

		if user.role == 'company_admin':

			return True, None

		if user.role == 'hr':

			return False, "HR cannot assign tasks"

		if user.role == 'manager':

			return True, None

		if user.role == 'team_lead':

			try:

				settings = TaskIntegrationSettings.objects.get(company_id=user.company_id)

				# Team leads can assign within their department or cross-dept if allowed

				if assignee.department_id != user.department_id:

					if not settings.allow_intra_department_assignments:

						return False, "Cross-department assignment not allowed"

			except TaskIntegrationSettings.DoesNotExist:

				pass

			return True, None

		if user.role == 'employee':

			try:

				settings = TaskIntegrationSettings.objects.get(company_id=user.company_id)

				if not settings.allow_employee_task_assignment:

					return False, "Employee task assignment disabled by admin"

				# Check department restrictions

				if assignee.department_id != user.department_id:

					if not settings.allow_intra_department_assignments:

						return False, "Cross-department assignment not allowed"

			except TaskIntegrationSettings.DoesNotExist:

				pass

			return True, None

		return False, "Unknown role"

	@staticmethod

	def check_can_view_task(user: User, task: Task) -> Tuple[bool, Optional[str]]:

		"""Check if user can view a specific task"""

		if user.role == 'company_admin':

			return True, None

		if user.role == 'hr':

			return False, "HR cannot view tasks"

		if user.role == 'manager':

			return True, None

		if user.role == 'team_lead':

			# Can view tasks in their department

			if task.assigned_department_id == user.department_id:

				return True, None

			if task.assigned_to == user.id:

				return True, None

			return False, "Cannot view tasks outside your department"

		if user.role == 'employee':

			# Can only view tasks assigned to them

			if task.assigned_to == user.id:

				return True, None

			return False, "Cannot view tasks not assigned to you"

		return False, "Unknown role"

	@staticmethod

	def check_can_update_task(user: User, task: Task) -> Tuple[bool, Optional[str]]:

		"""Check if user can change task status/details"""

		if user.role in ['company_admin', 'manager']:

			return True, None

		if user.role == 'hr':

			return False, "HR cannot update tasks"

		if user.role == 'team_lead':

			if task.assigned_department_id == user.department_id or task.assigned_to == user.id:

				return True, None

			return False, "Can only update tasks in your department"

		if user.role == 'employee':

			if task.assigned_to == user.id:

				return True, None

			return False, "Can only update tasks assigned to you"

		return False, "Unknown role"

	@staticmethod

	def check_can_edit_timeline_priority(user: User) -> Tuple[bool, Optional[str]]:

		"""Check if timeline/priority editing is enabled"""

		if user.role == 'company_admin':

			return True, None

		try:

			settings = TaskIntegrationSettings.objects.get(company_id=user.company_id)

			if not settings.allow_timeline_priority_editing:

				return False, "Timeline and priority editing disabled by admin"

		except TaskIntegrationSettings.DoesNotExist:

			pass

		if user.role in ['manager']:

			return True, None

		if user.role == 'team_lead':

			return True, None

		if user.role == 'employee':

			return False, "Employees cannot edit timeline/priority"

		return False, f"Role '{user.role}' cannot edit timeline/priority"

	@staticmethod

	def check_can_comment_task(user: User, task: Task) -> Tuple[bool, Optional[str]]:

		"""Check if user can comment on task"""

		if user.role == 'hr':

			return False, "HR cannot comment on tasks"

		if user.role == 'company_admin':

			return True, None

		if user.role == 'manager':

			return True, None

		if user.role == 'team_lead':

			# Can comment if in their department or assigned to them

			if task.assigned_department_id == user.department_id or task.assigned_to == user.id:

				return True, None

			return False, "Cannot comment on tasks outside your department"

		if user.role == 'employee':

			# Can comment if assigned to them or they created it

			if task.assigned_to == user.id or task.assigned_by == user.id:

				return True, None

			return False, "Cannot comment on this task"

		return False, "Unknown role"

	@staticmethod

	def get_filtered_tasks(user: User) -> Task:

		"""Get filtered queryset of tasks based on user role"""

		if user.role == 'company_admin':

			return Task.objects.filter(company_id=user.company_id, deleted_at__isnull=True)

		if user.role == 'hr':

			# HR cannot see any tasks

			return Task.objects.none()

		if user.role == 'manager':

			# Managers can see all tasks in company

			return Task.objects.filter(company_id=user.company_id, deleted_at__isnull=True)

		if user.role == 'team_lead':

			# Team leads can see tasks in their department

			return Task.objects.filter(

				Q(assigned_department_id=user.department_id) | Q(assigned_by=user.id),

				company_id=user.company_id,

				deleted_at__isnull=True

			)

		if user.role == 'employee':

			# Employees can see only tasks assigned to them

			return Task.objects.filter(

				assigned_to=user.id,

				company_id=user.company_id,

				deleted_at__isnull=True

			)

		return Task.objects.none()

	@staticmethod

	def validate_creation(user: User, data: dict, settings: TaskIntegrationSettings) -> Tuple[bool, Optional[str]]:

		"""Validate task creation data against integration settings"""

		# Check if multi-task assignment is allowed

		assigned_to_list = data.get('assigned_to')

		if isinstance(assigned_to_list, list) and len(assigned_to_list) > 1:

			if not settings.allow_multi_task_assignment:

				return False, "Multi-task assignment is disabled"

		return True, None

	@staticmethod

	def get_cross_department_redirection(

		user: User,

		assignee: User,

		settings: TaskIntegrationSettings

	) -> Tuple[bool, Optional[uuid.UUID]]:

		"""

		Check if cross-department assignment needs redirection

		Returns: (is_redirected, team_lead_id_if_redirected)

		"""

		# Same department = no redirection needed

		if assignee.department_id == user.department_id:

			return False, None

		# Check if redirection method is team_lead

		if settings.cross_department_task_redirection == 'team_lead':

			try:

				dept = Department.objects.get(id=assignee.department_id)

				if dept.head_id:

					return True, dept.head_id

			except Department.DoesNotExist:

				pass

		return False, None