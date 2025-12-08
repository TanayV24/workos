// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext1';
import { UserRole } from '@/types/workos';
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  BarChart3,
  Link2,
  Bell,
  Settings,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: Building2, label: 'Companies', path: '/companies', roles: ['developer'] },
  { icon: Users, label: 'Employees', path: '/employees', roles: ['developer', 'admin', 'manager'] },
  { icon: Clock, label: 'Attendance', path: '/attendance', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: Calendar, label: 'Leave', path: '/leave', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: DollarSign, label: 'Payroll', path: '/payroll', roles: ['developer', 'admin', 'manager'] },
  { icon: CreditCard, label: 'Advances', path: '/advances', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: FileText, label: 'Compliance', path: '/compliance', roles: ['developer', 'admin'] },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', roles: ['developer', 'admin', 'manager'] },
  { icon: Link2, label: 'Integrations', path: '/integrations', roles: ['developer', 'admin'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['developer', 'admin', 'manager', 'employee'] },
  { icon: Shield, label: 'Security', path: '/security', roles: ['developer', 'admin'] },

  // Whiteboard stays in main nav (so it's above the bottom pinned settings)
  { icon: FileText, label: 'Whiteboard', path: '/whiteboard', roles: ['developer', 'admin', 'manager', 'employee'] },
];

interface SidebarProps {}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(
    item => user && item.roles.includes(user.role)
  );

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  const itemVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 },
  };

  // helper to determine active state
  const isPathActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <motion.div
          className="flex items-center gap-3"
          animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-lg font-bold text-primary-foreground">W</span>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold text-gradient overflow-hidden whitespace-nowrap"
              >
                WorkOS
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = isPathActive(item.path);
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      className={cn(
                        'sidebar-item group relative',
                        isActive && 'active'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-primary"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      <Icon className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )} />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={itemVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile & Actions (bottom pinned area) */}
      <div className="border-t border-sidebar-border p-3 space-y-3 mt-auto">
        {/* Pinned Settings link (always visible at bottom) */}
        {user && (
          <NavLink
            to="/settings"
            className={cn(
              'sidebar-item group relative flex items-center gap-3 rounded-md px-2 py-2',
              isPathActive('/settings') ? 'active' : ''
            )}
            aria-label="Settings"
          >
            <Settings className={cn('h-5 w-5', isPathActive('/settings') ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={itemVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2 }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        )}

        {/* User Profile */}
        {user && (
          <div className={cn(
            'flex items-center gap-3 rounded-lg p-2 bg-secondary/50',
            isCollapsed && 'justify-center'
          )}>
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  variants={itemVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="flex-1 overflow-hidden"
                >
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            'w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={itemVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full justify-start gap-3',
            isCollapsed && 'justify-center'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={itemVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.aside>
  );
};
