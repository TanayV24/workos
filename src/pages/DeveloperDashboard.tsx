import React from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Users,
  Server,
  Database,
  Activity,
  Shield,
  Globe,
  Zap,
  Plus,
  Settings,
  Code,
  Terminal,
  GitBranch,
  HardDrive,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const developerKPIs = [
  { title: 'Total Companies', value: 156, change: 24, changeType: 'increase' as const, icon: Building2, color: 'primary' as const },
  { title: 'Active Users', value: 12450, change: 18, changeType: 'increase' as const, icon: Users, color: 'accent' as const },
  { title: 'API Requests/Day', value: 2.4, suffix: 'M', change: 32, changeType: 'increase' as const, icon: Zap, color: 'warning' as const },
  { title: 'System Uptime', value: 99.99, suffix: '%', change: 0.01, changeType: 'increase' as const, icon: Server, color: 'primary' as const },
];

const platformMetrics = [
  { name: 'CPU Usage', value: 42, max: 100, unit: '%', status: 'healthy' },
  { name: 'Memory Usage', value: 68, max: 100, unit: '%', status: 'warning' },
  { name: 'Storage Used', value: 1.2, max: 5, unit: 'TB', status: 'healthy' },
  { name: 'Bandwidth', value: 850, max: 1000, unit: 'GB/day', status: 'healthy' },
];

const recentCompanies = [
  { name: 'TechCorp Solutions', plan: 'Enterprise', users: 450, status: 'active', revenue: '₹1,25,000/mo' },
  { name: 'StartupX Labs', plan: 'Pro', users: 28, status: 'active', revenue: '₹15,000/mo' },
  { name: 'Design Studio Pro', plan: 'Business', users: 85, status: 'trial', revenue: '₹0/mo' },
  { name: 'Finance Partners', plan: 'Enterprise', users: 320, status: 'active', revenue: '₹95,000/mo' },
  { name: 'Healthcare Plus', plan: 'Pro', users: 45, status: 'pending', revenue: '₹15,000/mo' },
];

const apiEndpoints = [
  { name: '/api/v1/employees', calls: '1.2M', latency: '45ms', status: 'healthy' },
  { name: '/api/v1/attendance', calls: '850K', latency: '32ms', status: 'healthy' },
  { name: '/api/v1/payroll', calls: '420K', latency: '128ms', status: 'warning' },
  { name: '/api/v1/leaves', calls: '380K', latency: '28ms', status: 'healthy' },
];

const DeveloperDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Developer Console"
      subtitle="Platform-wide system administration and monitoring"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {developerKPIs.map((kpi, index) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            suffix={kpi.suffix}
            change={kpi.change}
            changeType={kpi.changeType}
            icon={kpi.icon}
            color={kpi.color}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Platform Metrics & API Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Platform Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Platform Metrics
              </CardTitle>
              <Badge variant="success">All Systems Normal</Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {platformMetrics.map((metric, index) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {metric.value}{metric.unit} / {metric.max}{metric.unit}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={(metric.value / metric.max) * 100} className="h-2" />
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${
                      metric.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* API Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                API Endpoints
              </CardTitle>
              <Button variant="ghost" size="sm">View All</Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {apiEndpoints.map((endpoint, index) => (
                  <motion.div
                    key={endpoint.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        endpoint.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <code className="text-sm font-mono">{endpoint.name}</code>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{endpoint.calls}</span>
                      <span className={endpoint.status === 'warning' ? 'text-amber-500' : ''}>
                        {endpoint.latency}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Companies Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Companies Overview
            </CardTitle>
            <Button variant="gradient" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Company</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Plan</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Users</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Revenue</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompanies.map((company, index) => (
                    <motion.tr
                      key={company.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={
                          company.plan === 'Enterprise' ? 'default' :
                          company.plan === 'Business' ? 'secondary' : 'outline'
                        }>
                          {company.plan}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{company.users}</td>
                      <td className="p-3">
                        <Badge variant={
                          company.status === 'active' ? 'success' :
                          company.status === 'trial' ? 'warning' : 'secondary'
                        }>
                          {company.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{company.revenue}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
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

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Developer Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Building2 className="h-5 w-5" />
                <span className="text-xs">New Company</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Database className="h-5 w-5" />
                <span className="text-xs">Database</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <GitBranch className="h-5 w-5" />
                <span className="text-xs">Deployments</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-xs">Security</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <HardDrive className="h-5 w-5" />
                <span className="text-xs">Storage</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Globe className="h-5 w-5" />
                <span className="text-xs">Domains</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default DeveloperDashboard;
