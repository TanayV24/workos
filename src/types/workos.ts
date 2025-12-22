export type UserRole = 'company_admin' | 'manager' | 'team_lead' | 'employee' | 'hr';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'on-leave';
}

export interface Employee extends User {
  employeeId: string;
  manager?: string;
  salary?: number;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  attendance?: AttendanceRecord[];
  leaves?: LeaveRequest[];
  tasks?: Task[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave';
  workHours?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
  approvedBy?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  assigneeName: string;
  assigneeAvatar?: string;
  dueDate: string;
  createdAt: string;
  tags: string[];
  comments?: TaskComment[];
  attachments?: string[];
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: {
    hra: number;
    transport: number;
    medical: number;
    special: number;
  };
  deductions: {
    pf: number;
    esi: number;
    tax: number;
    other: number;
  };
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  paidOn?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: string;
  color: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}
