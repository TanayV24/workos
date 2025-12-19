// src/Dashboards/ManagerDashboard.tsx - OPTIMIZED FOR MANAGER/HR

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { TaskProgress } from '@/components/dashboard/TaskProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LeaveBalance } from '@/components/dashboard/LeaveBalance';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, Clock, CheckSquare, Calendar, Search, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Manager KPI Data - Will be replaced with backend data
const managerKPIs = [
  {
    title: 'Team Members',
    value: 0,
    change: 4,
    changeType: 'increase' as const,
    icon: Users,
    color: 'primary' as const,
  },
  {
    title: 'Attendance Rate',
    value: 0,
    suffix: '%',
    change: 3,
    changeType: 'increase' as const,
    icon: Clock,
    color: 'accent' as const,
  },
  {
    title: 'Active Tasks',
    value: 0,
    change: 2,
    changeType: 'decrease' as const,
    icon: CheckSquare,
    color: 'warning' as const,
  },
  {
    title: 'Leave Requests',
    value: 0,
    change: 1,
    changeType: 'increase' as const,
    icon: Calendar,
    color: 'destructive' as const,
  },
];

interface TeamMember {
  id: string;
  name: string;
  position: string;
  email: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

interface DashboardStats {
  teamMembers: number;
  attendanceRate: number;
  activeTasks: number;
  leaveRequests: number;
}

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    teamMembers: 0,
    attendanceRate: 0,
    activeTasks: 0,
    leaveRequests: 0,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [kpis, setKpis] = useState(managerKPIs);

  const displayName = user?.full_name || user?.name || 'Manager';

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // TODO: Replace with actual API calls from your backend service
        // Example: const response = await managerService.getDashboardStats();

        // Temporary mock data - Remove once backend is ready
        const mockStats = {
          teamMembers: 24,
          attendanceRate: 92,
          activeTasks: 18,
          leaveRequests: 5,
        };

        const mockTeamMembers: TeamMember[] = [
          {
            id: '1',
            name: 'Raj Kumar',
            position: 'Senior Developer',
            email: 'raj@company.com',
            status: 'active',
          },
          {
            id: '2',
            name: 'Priya Singh',
            position: 'UI/UX Designer',
            email: 'priya@company.com',
            status: 'active',
          },
          {
            id: '3',
            name: 'Amit Patel',
            position: 'QA Engineer',
            email: 'amit@company.com',
            status: 'on_leave',
          },
          {
            id: '4',
            name: 'Neha Gupta',
            position: 'Full Stack Developer',
            email: 'neha@company.com',
            status: 'active',
          },
          {
            id: '5',
            name: 'Vikram Reddy',
            position: 'DevOps Engineer',
            email: 'vikram@company.com',
            status: 'active',
          },
        ];

        setStats(mockStats);
        setTeamMembers(mockTeamMembers);

        // Update KPIs with actual data
        const updatedKpis = managerKPIs.map((kpi, index) => ({
          ...kpi,
          value:
            index === 0
              ? mockStats.teamMembers
              : index === 1
              ? mockStats.attendanceRate
              : index === 2
              ? mockStats.activeTasks
              : mockStats.leaveRequests,
        }));
        setKpis(updatedKpis);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'on_leave':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'on_leave':
        return 'On Leave';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Active';
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Welcome Section */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {displayName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your team and monitor performance
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team..."
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* User Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                  {displayName?.charAt(0)?.toUpperCase() || 'M'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <KPICard
                title={kpi.title}
                value={kpi.value}
                suffix={kpi.suffix}
                change={kpi.change}
                changeType={kpi.changeType}
                icon={kpi.icon}
                color={kpi.color}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts and Widgets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Attendance Chart - 2 columns */}
          <div className="lg:col-span-2">
            <AttendanceChart />
          </div>

          {/* Leave Balance */}
          <div className="lg:col-span-1">
            <LeaveBalance />
          </div>
        </motion.div>

        {/* Team Members Section */}
        {teamMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle>Team Members</CardTitle>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {teamMembers.length} members
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {member.position}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full',
                            getStatusColor(member.status)
                          )}
                        >
                          <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-70"></span>
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Task Progress and Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
        >
          <TaskProgress />
          <RecentActivity />
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;