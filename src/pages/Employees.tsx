// src/pages/Employees.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
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
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ORIGINAL MOCK EMPLOYEES (card layout)
const mockEmployees = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    phone: '+1 234 567 890',
    department: 'Engineering',
    designation: 'Senior Developer',
    status: 'active',
    joinDate: '2022-03-15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    location: 'New York',
  },
  {
    id: '2',
    name: 'Sarah Smith',
    email: 'sarah.smith@company.com',
    phone: '+1 234 567 891',
    department: 'Design',
    designation: 'UI/UX Lead',
    status: 'active',
    joinDate: '2021-08-22',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    location: 'San Francisco',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.j@company.com',
    phone: '+1 234 567 892',
    department: 'Marketing',
    designation: 'Marketing Manager',
    status: 'on-leave',
    joinDate: '2020-01-10',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    location: 'Chicago',
  },
  {
    id: '4',
    name: 'Emily Brown',
    email: 'emily.b@company.com',
    phone: '+1 234 567 893',
    department: 'HR',
    designation: 'HR Specialist',
    status: 'active',
    joinDate: '2023-05-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    location: 'Boston',
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david.w@company.com',
    phone: '+1 234 567 894',
    department: 'Finance',
    designation: 'Financial Analyst',
    status: 'inactive',
    joinDate: '2019-11-20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    location: 'Seattle',
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    email: 'lisa.a@company.com',
    phone: '+1 234 567 895',
    department: 'Engineering',
    designation: 'DevOps Engineer',
    status: 'active',
    joinDate: '2022-09-05',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    location: 'Austin',
  },
];

const statusColors: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  inactive: 'destructive',
  'on-leave': 'warning',
};

const Employees: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddHRModalOpen, setIsAddHRModalOpen] = useState(false);
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] =
    useState(false);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
  });

  const filteredEmployees = mockEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      selectedDepartment === 'all' || emp.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const departments = ['all', ...new Set(mockEmployees.map((e) => e.department))];

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Employee Added',
      description: `${newEmployee.name} has been added successfully`,
    });
    setIsAddEmployeeModalOpen(false);
    setNewEmployee({
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
    });
  };

  return (
    <DashboardLayout>
      {/* Sticky header from Header.tsx */}
      <Header
        title="Employees"
        subtitle="Manage and organize your team members"
      />

      <div className="px-4 pt-4 pb-8 space-y-6">
        {/* Top actions: search + filters + 3 buttons */}
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
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3 main buttons + view toggle */}
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Add Employee */}
              <Button
                onClick={() => setIsAddEmployeeModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>

              {/* Add HR/Manager */}
              <Button
                onClick={() => setIsAddHRModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <UserPlus className="h-4 w-4" />
                Add HR/Manager
              </Button>

              {/* Add Department */}
              <Button
                onClick={() => setIsAddDepartmentModalOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Add Department
              </Button>
            </div>

            {/* Keep original grid/list toggle (optional) */}
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

        {/* EMPLOYEE CARDS / LIST */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {viewMode === 'grid' && (
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
                          No employees found matching your criteria
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEmployees.map((employee, index) => (
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
                                        {employee.designation}
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
                                        <Eye className="h-4 w-4 mr-2" /> View
                                        Profile
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />{' '}
                                        Delete
                                      </DropdownMenuItem>
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
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{employee.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{employee.location}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Joined {employee.joinDate}</span>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                  <Badge
                                    variant={
                                      statusColors[
                                        employee.status as keyof typeof statusColors
                                      ]
                                    }
                                  >
                                    {employee.status === 'on-leave'
                                      ? 'On Leave'
                                      : employee.status === 'inactive'
                                      ? 'Inactive'
                                      : 'Active'}
                                  </Badge>
                                  <Badge variant="ghost">
                                    {employee.department}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {viewMode === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card variant="glass">
                  <CardContent className="p-0">
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
                            <th className="text-left p-4 font-medium text-muted-foreground">
                              Location
                            </th>
                            <th className="text-left p-4 font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left p-4 font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.map((employee, index) => (
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
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div>
                                  <p className="font-medium">
                                    {employee.department}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {employee.designation}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {employee.location}
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant={
                                    statusColors[
                                      employee.status as keyof typeof statusColors
                                    ]
                                  }
                                >
                                  {employee.status === 'on-leave'
                                    ? 'On Leave'
                                    : employee.status === 'inactive'
                                    ? 'Inactive'
                                    : 'Active'}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {filteredEmployees.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground">
                  No employees found matching your criteria
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      {/* MODALS (placeholders – you can plug in real forms) */}

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
                value={newEmployee.name}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmployee.email}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, email: e.target.value })
                }
                placeholder="john@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newEmployee.phone}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, phone: e.target.value })
                }
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={newEmployee.department}
                  onValueChange={(value) =>
                    setNewEmployee({ ...newEmployee, department: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter((d) => d !== 'all')
                      .map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={newEmployee.designation}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      designation: e.target.value,
                    })
                  }
                  placeholder="Role"
                />
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
            <Button variant="gradient" onClick={handleAddEmployee}>
              Add Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add HR/Manager Modal */}
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
            <Button onClick={() => setIsAddHRModalOpen(false)}>
              Save (placeholder)
            </Button>
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
          <div className="py-4 text-sm text-muted-foreground">
            Add your department creation form here.
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddDepartmentModalOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => setIsAddDepartmentModalOpen(false)}>
              Save (placeholder)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Employees;
