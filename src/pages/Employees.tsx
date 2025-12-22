import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Filter,
  Grid,
  List,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Briefcase,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { departmentRest, userRest } from '@/services/api';

// RBAC IMPORTS
import {
  getPageButtonVisibility,
  getCardActionVisibility,
  filterEmployeesByRole,
  ROLES,
  type UserRole,
} from '@/utils/roles';
import { useAuth } from '@/contexts/AuthContext';

// =======================
// INTERFACES
// =======================
interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  head_id?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;       // department name for display
  department_id?: string;    // department id for filtering
  designation?: string;
  status?: 'active' | 'inactive' | 'on-leave';
  join_date?: string;
  avatar?: string;
  location?: string;
  employee_id?: string;
}

const statusColors: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  inactive: 'destructive',
  'on-leave': 'warning',
};

const Employees: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddHRModalOpen, setIsAddHRModalOpen] = useState(false);
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] =
    useState(false);

  // STATE
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET USER WITH ROLE
  const { user } = useAuth();

  // NORMALIZE ROLE AND GET VISIBILITY FLAGS
  const userRole = user?.role as UserRole | undefined;

  const {
    showAddEmployee,
    showAddDepartment,
    showAddManager,
  } = getPageButtonVisibility(userRole);

  const { showEditButton, showDeleteButton } = getCardActionVisibility(userRole);

  const canSeeFullDetails =
    userRole === ROLES.ADMIN ||
    userRole === ROLES.HR ||
    userRole === ROLES.MANAGER;

  const canSeeBasicDetails =
    userRole === ROLES.TEAM_LEAD || userRole === ROLES.EMPLOYEE;

  const userDepartmentId = user?.department_id;

  // CHECK IF USER CAN ACCESS EMPLOYEES PAGE
  const canAccessEmployeesPage =
    userRole === ROLES.ADMIN ||
    userRole === ROLES.HR ||
    userRole === ROLES.MANAGER ||
    userRole === ROLES.TEAM_LEAD;

  // FORMS
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '', // department_id
    designation: '',
    role: 'employee',
  });

  // ==============
  // LOAD DATA
  // ==============
  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await departmentRest.listDepartments();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await userRest.listEmployees();
      if (response.success) {
        console.log('Employees loaded', response.data);
        setEmployees(response.data);
      } else {
        console.error('Failed to load employees', response.error);
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error loading employees', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // APPLY ROLE-BASED DATA VISIBILITY FIRST
  // ===============================
  const employeesForRole = useMemo(
    () =>
      filterEmployeesByRole(
        employees as any,
        userRole,
        userDepartmentId ?? undefined,
      ),
    [employees, userRole, userDepartmentId],
  );

  // ===============================
  // FILTER EMPLOYEES (SEARCH + DEPARTMENT) ONLY ON CURRENT LIST
  // ===============================
  const filteredEmployees = useMemo(() => {
    // department filter
    const byDepartment = employeesForRole.filter((emp: Employee) => {
      if (selectedDepartment === 'all') return true;
      // selectedDepartment is department name; employees have department name
      return emp.department === selectedDepartment;
    });

    if (!searchQuery.trim()) return byDepartment;

    const q = searchQuery.toLowerCase();

    return byDepartment.filter((emp: Employee) => {
      const baseFields: (string | undefined)[] = [
        emp.name,
        emp.email,
        emp.department,
      ];

      if (canSeeFullDetails) {
        baseFields.push(
          emp.employee_id,
          emp.location,
          emp.designation,
          emp.phone,
          emp.status,
        );
      }

      return baseFields
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [employeesForRole, selectedDepartment, searchQuery, canSeeFullDetails]);

  // ===============================
  // Generate departments list from API; fallback to employees if empty
  // ===============================
  const departmentsList = useMemo(() => {
    if (departments.length > 0) {
      return ['all', ...departments.map((d) => d.name)];
    }

    const fromEmployees = Array.from(
      new Set(
        employeesForRole
          .map((e: Employee) => e.department)
          .filter((d): d is string => !!d),
      ),
    );

    return ['all', ...fromEmployees];
  }, [departments, employeesForRole]);

  // ===============================
  // ADD DEPARTMENT
  // ===============================
  const handleAddDepartment = async () => {
    setError(null);

    if (
      !deptForm.name.trim() ||
      !deptForm.code.trim() ||
      !deptForm.description.trim()
    ) {
      setError('All fields are required');
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (deptForm.name.trim().length < 2) {
      setError('Name min 2 chars');
      return;
    }

    if (
      deptForm.code.trim().length < 3 ||
      deptForm.code.trim().length > 4
    ) {
      setError('Code must be 3-4 chars');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(deptForm.code.trim())) {
      setError('Code alphanumeric only');
      return;
    }

    if (deptForm.description.trim().length < 5) {
      setError('Description min 5 chars');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating department...', {
        name: deptForm.name.trim(),
        code: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim(),
      });

      const response = await departmentRest.addDepartment({
        name: deptForm.name.trim(),
        code: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim(),
      });

      console.log('Response', response);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Department ${deptForm.name} created!`,
        });
        setDeptForm({ name: '', code: '', description: '' });
        setIsAddDepartmentModalOpen(false);
        loadDepartments();
      } else {
        const msg =
          response.error ||
          (response.errors ? JSON.stringify(response.errors) : 'Failed');
        console.error('Error', msg);
        setError(msg);
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Exception', err);
      setError(err.message || 'Failed');
      toast({
        title: 'Error',
        description: err.message || 'Failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // ADD EMPLOYEE WITH DEPARTMENT
  // ===============================
  const handleAddEmployeeWithDept = async () => {
    if (!empForm.name || !empForm.email || !empForm.department) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await userRest.addEmployee({
        name: empForm.name.trim(),
        email: empForm.email.trim(),
        role: empForm.role as 'employee' | 'team_lead',
        department_id: empForm.department,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Employee ${empForm.name} created successfully! Email sent.`,
        });
        setEmpForm({
          name: '',
          email: '',
          phone: '',
          department: '',
          designation: '',
          role: 'employee',
        });
        setIsAddEmployeeModalOpen(false);
        // RELOAD EMPLOYEES
        loadEmployees();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create employee',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create employee',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // NO ACCESS STATE
  // ===============================
  if (!canAccessEmployeesPage) {
    return (
      <DashboardLayout>
        <Header
          title="Employees"
          subtitle="Manage and organize your team members"
        />
        <div className="px-4 pt-4 pb-8">
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">
                Access Denied
              </p>
              <p className="text-sm text-muted-foreground">
                You do not have permission to access the Employees page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <DashboardLayout>
      <Header
        title="Employees"
        subtitle="Manage and organize your team members"
      />

      <div className="px-4 pt-4 pb-8 space-y-6">
        {/* Search, Filters, Buttons */}
        <div className="flex flex-col gap-4">
          {/* Search + Department Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsList.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons + View Toggle */}
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              {showAddEmployee && (
                <Button
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Employee
                </Button>
              )}

              {showAddManager && (
                <Button
                  onClick={() => setIsAddHRModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Add HR/Manager
                </Button>
              )}

              {showAddDepartment && (
                <Button
                  onClick={() => setIsAddDepartmentModalOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Add Department
                </Button>
              )}
            </div>

            <div className="flex border rounded-lg overflow-hidden self-start">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* EMPLOYEE DISPLAY */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {viewMode === 'grid' && (
              <TabsContent value="grid" asChild>
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card variant="glass">
                    <CardContent className="p-6">
                      {filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-muted-foreground">
                            {employeesForRole.length === 0
                              ? 'No employees yet. Add one to get started!'
                              : 'No employees found matching your criteria'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredEmployees.map(
                            (employee: Employee, index: number) => (
                              <motion.div
                                key={employee.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <Card
                                  variant="glass"
                                  className="group hover:border-primary/30 transition-all"
                                >
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                                          <AvatarImage
                                            src={employee.avatar}
                                            alt={employee.name}
                                          />
                                          <AvatarFallback>
                                            {employee.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h3 className="font-semibold">
                                            {employee.name}
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            {employee.designation || 'N/A'}
                                          </p>
                                        </div>
                                      </div>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Profile
                                          </DropdownMenuItem>
                                          {showEditButton && (
                                            <DropdownMenuItem>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                          )}
                                          {showDeleteButton && (
                                            <DropdownMenuItem className="text-destructive">
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span className="truncate">
                                          {employee.email}
                                        </span>
                                      </div>

                                      {canSeeFullDetails && employee.phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Phone className="h-4 w-4" />
                                          <span>{employee.phone}</span>
                                        </div>
                                      )}

                                      {employee.location && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <MapPin className="h-4 w-4" />
                                          <span>{employee.location}</span>
                                        </div>
                                      )}

                                      {employee.join_date && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Calendar className="h-4 w-4" />
                                          <span>
                                            Joined{' '}
                                            {new Date(
                                              employee.join_date,
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                      <div>
                                        {employee.status && (
                                          <Badge
                                            variant={
                                              statusColors[
                                                employee.status
                                              ] || 'success'
                                            }
                                          >
                                            {employee.status === 'on-leave'
                                              ? 'On Leave'
                                              : employee.status === 'inactive'
                                              ? 'Inactive'
                                              : 'Active'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div>
                                        {employee.department && (
                                          <Badge variant="ghost">
                                            {employee.department}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ),
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}

            {viewMode === 'list' && (
              <TabsContent value="list" asChild>
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card variant="glass">
                    <CardContent className="p-0">
                      {filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {employeesForRole.length === 0
                              ? 'No employees yet'
                              : 'No employees found'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-4 font-medium text-muted-foreground">
                                  Employee
                                </th>
                                <th className="text-left p-4 font-medium text-muted-foreground">
                                  Department
                                </th>
                                {canSeeFullDetails && (
                                  <>
                                    <th className="text-left p-4 font-medium text-muted-foreground">
                                      Phone
                                    </th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">
                                      Status
                                    </th>
                                  </>
                                )}
                                {canSeeBasicDetails && (
                                  <th className="text-left p-4 font-medium text-muted-foreground">
                                    Presence
                                  </th>
                                )}
                                {(showEditButton || showDeleteButton) && (
                                  <th className="text-left p-4 font-medium text-muted-foreground">
                                    Actions
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEmployees.map(
                                (employee: Employee, index: number) => (
                                  <motion.tr
                                    key={employee.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                                  >
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                          <AvatarImage
                                            src={employee.avatar}
                                            alt={employee.name}
                                          />
                                          <AvatarFallback>
                                            {employee.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium">
                                            {employee.name}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {employee.email}
                                          </p>
                                          {canSeeFullDetails &&
                                            employee.employee_id && (
                                              <p className="text-xs text-muted-foreground">
                                                ID:{' '}
                                                {employee.employee_id}
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div>
                                        <p className="font-medium">
                                          {employee.department || 'N/A'}
                                        </p>
                                        {canSeeFullDetails && (
                                          <p className="text-sm text-muted-foreground">
                                            {employee.designation || 'N/A'}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    {canSeeFullDetails && (
                                      <>
                                        <td className="p-4 text-muted-foreground">
                                          {employee.phone || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                          {employee.status && (
                                            <Badge
                                              variant={
                                                statusColors[
                                                  employee.status
                                                ] || 'success'
                                              }
                                            >
                                              {employee.status ===
                                              'on-leave'
                                                ? 'On Leave'
                                                : employee.status ===
                                                  'inactive'
                                                ? 'Inactive'
                                                : 'Active'}
                                            </Badge>
                                          )}
                                        </td>
                                      </>
                                    )}
                                    {canSeeBasicDetails && (
                                      <td className="p-4">
                                        {employee.status === 'active'
                                          ? 'Present'
                                          : 'Not present'}
                                      </td>
                                    )}
                                    {(showEditButton || showDeleteButton) && (
                                      <td className="p-4">
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          {showEditButton && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          )}
                                          {showDeleteButton && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </motion.tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      {/* MODALS */}

      {/* Add Employee Modal */}
      <Dialog
        open={isAddEmployeeModalOpen}
        onOpenChange={setIsAddEmployeeModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={empForm.name}
                onChange={(e) =>
                  setEmpForm({ ...empForm, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={empForm.email}
                onChange={(e) =>
                  setEmpForm({ ...empForm, email: e.target.value })
                }
                placeholder="john@company.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={empForm.phone}
                onChange={(e) =>
                  setEmpForm({ ...empForm, phone: e.target.value })
                }
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={empForm.department}
                  onValueChange={(value) =>
                    setEmpForm({ ...empForm, department: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={empForm.role}
                  onValueChange={(value) =>
                    setEmpForm({ ...empForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddEmployeeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleAddEmployeeWithDept}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Add Employee'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add HR/Manager Modal (placeholder) */}
      <Dialog open={isAddHRModalOpen} onOpenChange={setIsAddHRModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add HR/Manager</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Add your HR/Manager form fields here.
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddHRModalOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => setIsAddHRModalOpen(false)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department Modal */}
      <Dialog
        open={isAddDepartmentModalOpen}
        onOpenChange={setIsAddDepartmentModalOpen}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
              <strong>Error</strong> {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dept-name"
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, name: e.target.value })
                }
                placeholder="e.g., Engineering"
                maxLength={255}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddDepartment();
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dept-code">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dept-code"
                maxLength={4}
                value={deptForm.code}
                onChange={(e) =>
                  setDeptForm({
                    ...deptForm,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  })
                }
                placeholder="e.g., ENG"
                className="uppercase font-mono"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddDepartment();
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dept-desc">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dept-desc"
                value={deptForm.description}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, description: e.target.value })
                }
                placeholder="Department description"
                maxLength={500}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddDepartment();
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDepartmentModalOpen(false);
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleAddDepartment}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Add Department'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Employees;
