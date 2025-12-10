// src/components/layout/Sidebar.tsx - WORKING VERSION WITH CHAT

import React, { useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
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
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: ("developer" | "admin" | "manager" | "employee")[];
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard",
    roles: ["developer", "admin", "manager", "employee"],
  },
  { icon: Building2, label: "Companies", path: "/companies", roles: ["developer"] },
  {
    icon: Users,
    label: "Employees",
    path: "/employees",
    roles: ["developer", "admin", "manager"],
  },
  {
    icon: Clock,
    label: "Attendance",
    path: "/attendance",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    path: "/tasks",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: Calendar,
    label: "Leave",
    path: "/leave",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: DollarSign,
    label: "Payroll",
    path: "/payroll",
    roles: ["developer", "admin", "manager"],
  },
  {
    icon: CreditCard,
    label: "Advances",
    path: "/advances",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: FileText,
    label: "Compliance",
    path: "/compliance",
    roles: ["developer", "admin"],
  },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/analytics",
    roles: ["developer", "admin", "manager"],
  },
  {
    icon: Link2,
    label: "Integrations",
    path: "/integrations",
    roles: ["developer", "admin"],
  },
  {
    icon: Bell,
    label: "Notifications",
    path: "/notifications",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: Shield,
    label: "Security",
    path: "/security",
    roles: ["developer", "admin"],
  },
  {
    icon: MessageSquare,
    label: "Chat",
    path: "/chat",
    roles: ["developer", "admin", "manager", "employee"],
  },
  {
    icon: FileText,
    label: "Whiteboard",
    path: "/whiteboard",
    roles: ["developer", "admin", "manager", "employee"],
  },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return null; // Don't render sidebar if no user
  }

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user.role as any)
  );

  const isPathActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const userInitial =
    user.full_name?.charAt(0)?.toUpperCase() ||
    user.name?.charAt(0)?.toUpperCase() ||
    "?";
  const displayName = user.full_name || user.name || "User";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col transition-all duration-300"
      style={{ width: isCollapsed ? 80 : 280 }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <motion.div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg">
            W
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              WorkOS
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {filteredMenuItems.map((item) => {
          const isActive = isPathActive(item.path);
          const Icon = item.icon;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink to={item.path}>
                  <motion.div
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5 relative z-10" />
                    {!isCollapsed && (
                      <motion.span className="relative z-10 font-medium text-sm">
                        {item.label}
                      </motion.span>
                    )}
                  </motion.div>
                </NavLink>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* User Profile & Actions */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Settings */}
        <NavLink to="/settings">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-3",
              isCollapsed && "justify-center"
            )}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm">Settings</span>}
          </Button>
        </NavLink>

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-accent/50",
            isCollapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </Button>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full justify-start gap-3",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </Button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
