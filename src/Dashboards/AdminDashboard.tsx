// src/Dashboards/AdminDashboard.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { TaskProgress } from '@/components/dashboard/TaskProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LeaveBalance } from '@/components/dashboard/LeaveBalance';
import { 
  Users, 
  Clock, 
  CheckSquare, 
  DollarSign, 
  Plus,
  Loader2,
  X,
  Mail,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { authRest } from '@/services/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// Admin KPI Data
const adminKPIs = [
  { 
    title: 'Total Employees', 
    value: 248, 
    change: 12, 
    changeType: 'increase' as const, 
    icon: Users, 
    color: 'primary' as const 
  },
  { 
    title: 'Present Today', 
    value: 215, 
    change: 5, 
    changeType: 'increase' as const, 
    icon: Clock, 
    color: 'accent' as const 
  },
  { 
    title: 'Pending Tasks', 
    value: 47, 
    change: 8, 
    changeType: 'decrease' as const, 
    icon: CheckSquare, 
    color: 'warning' as const 
  },
  { 
    title: 'Payroll Processed', 
    value: 98, 
    suffix: '%', 
    change: 2, 
    changeType: 'increase' as const, 
    icon: DollarSign, 
    color: 'primary' as const 
  },
];

interface TeamMember {
  name: string;
  email: string;
  role: 'manager' | 'hr' | 'employee';
  addedAt: string;
}

interface FormData {
  name: string;
  email: string;
  role: 'manager' | 'hr' | 'employee';
}

const AdminDashboard: React.FC = () => {
  // Use hooks directly - they're already provided by App.tsx providers
  const { user } = useAuth();
  const { isDark } = useTheme();

  // State for Add Team Member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'manager',
  });
  const [loading, setLoading] = useState(false);
  const [addedMembers, setAddedMembers] = useState<TeamMember[]>([]);

  const displayName = user?.full_name || user?.name || 'Admin';

  // Handle form input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle Add Team Member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Call backend endpoint
      const response = await authRest.addManager(
        formData.name,
        formData.email,
        formData.role
      );

      if (response.success) {
        toast({
          title: 'Success!',
          description: `${formData.name} has been added as ${formData.role}`,
        });

        // Add to recently added list
        setAddedMembers((prev) => [
          {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            addedAt: new Date().toLocaleString(),
          },
          ...prev,
        ]);

        // Reset form
        setFormData({
          name: '',
          email: '',
          role: 'manager',
        });

        // Close form
        setShowAddForm(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 
          error instanceof Error 
            ? error.message 
            : 'Failed to add team member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove team member from list
  const handleRemoveMember = (index: number) => {
    setAddedMembers((prev) => prev.filter((_, i) => i !== index));
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
                Manage your team and monitor key metrics
              </p>
            </div>

            {/* Action Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className={cn(
                  'gap-2 h-10 px-4',
                  showAddForm && 'bg-red-500 hover:bg-red-600'
                )}
              >
                {showAddForm ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Team Member
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Add Team Member Form */}
        <motion.div
          initial={showAddForm ? { opacity: 0, height: 0 } : { opacity: 0 }}
          animate={showAddForm ? { opacity: 1, height: 'auto' } : { opacity: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {showAddForm && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-950 border-b border-blue-200 dark:border-blue-800 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-lg">Add New Team Member</CardTitle>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add a Manager, HR Manager, or Employee to your team
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleAddTeamMember} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label 
                        htmlFor="name" 
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g., John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="transition-all"
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label 
                        htmlFor="email" 
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="e.g., john@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="role" 
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="manager">Manager</option>
                      <option value="hr">HR Manager</option>
                      <option value="employee">Employee</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Role determines dashboard access and permissions
                    </p>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {loading ? 'Adding Member...' : 'Add Team Member'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      disabled={loading}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* KPI Cards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {adminKPIs.map((kpi, index) => (
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

        {/* Recently Added Team Members Section */}
        {addedMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle>Recently Added Team Members</CardTitle>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {addedMembers.length} member{addedMembers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {addedMembers.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Avatar */}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0"
                        >
                          <User className="w-6 h-6 text-white" />
                        </motion.div>

                        {/* Member Info */}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {member.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Mail className="w-4 h-4" />
                            {member.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded capitalize font-medium">
                              {member.role}
                            </span>
                            <span>•</span>
                            <span>{member.addedAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status and Action */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Created
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Email sent
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveMember(index)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <X className="w-5 h-5" />
                        </motion.button>
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

export default AdminDashboard;