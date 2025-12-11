// src/components/layout/Sidebar.tsx - TOOLTIPS WORKING PERFECTLY

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebarCollapse } from "@/contexts/sideBarContext";
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
  Settings,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  PenTool,
  ChevronDown,
  Sparkles,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubMenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface GroupedMenuItem {
  label: string;
  icon: React.ElementType;
  subItems: SubMenuItem[];
  collapsible: true;
}

type MenuItemType = MenuItem | GroupedMenuItem;

interface MenuSection {
  label: string;
  items: MenuItemType[];
  roles: ("developer" | "admin" | "manager" | "employee")[];
}

const isGroupedMenuItem = (item: MenuItemType): item is GroupedMenuItem => {
  return "collapsible" in item && item.collapsible === true;
};

const menuSections: MenuSection[] = [
  {
    label: "CORE",
    roles: ["developer", "admin", "manager", "employee"],
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/dashboard",
      },
    ],
  },
  {
    label: "PEOPLE",
    roles: ["developer", "admin", "manager"],
    items: [
      {
        icon: Building2,
        label: "Companies",
        path: "/companies",
      },
      {
        icon: Users,
        label: "Employees",
        path: "/employees",
      },
    ],
  },
  {
    label: "WORK",
    roles: ["developer", "admin", "manager", "employee"],
    items: [
      {
        icon: CheckSquare,
        label: "Tasks",
        path: "/tasks",
      },
      {
        icon: Clock,
        label: "Attendance",
        path: "/attendance",
      },
      {
        icon: Calendar,
        label: "Leave",
        path: "/leave",
      },
    ],
  },
  {
    label: "COLLABORATE",
    roles: ["developer", "admin", "manager", "employee"],
    items: [
      {
        label: "Team Space",
        icon: MessageSquare,
        subItems: [
          { icon: MessageSquare, label: "Chat", path: "/chat" },
          { icon: PenTool, label: "Whiteboard", path: "/whiteboard" },
        ],
        collapsible: true,
      },
    ],
  },
  {
    label: "FINANCE",
    roles: ["developer", "admin", "manager"],
    items: [
      {
        label: "Payments",
        icon: DollarSign,
        subItems: [
          { icon: DollarSign, label: "Payroll", path: "/payroll" },
          { icon: CreditCard, label: "Advances", path: "/advances" },
        ],
        collapsible: true,
      },
    ],
  },
  {
    label: "INSIGHTS",
    roles: ["developer", "admin", "manager"],
    items: [
      {
        icon: BarChart3,
        label: "Analytics",
        path: "/analytics",
      },
    ],
  },
  {
    label: "SYSTEM",
    roles: ["developer", "admin"],
    items: [
      {
        label: "Admin",
        icon: Shield,
        subItems: [
          { icon: Shield, label: "Security", path: "/security" },
          { icon: Link2, label: "Integrations", path: "/integrations" },
          { icon: FileText, label: "Compliance", path: "/compliance" },
        ],
        collapsible: true,
      },
    ],
  },
];

const sidebarVariants: Variants = {
  expanded: {
    width: 280,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
  collapsed: {
    width: 90,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  }),
  hover: {
    x: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};

const floatingButtonsVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: { duration: 0.2 },
  },
};

const floatingButtonVariants: Variants = {
  hidden: { opacity: 0, scale: 0, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  hover: {
    scale: 1.1,
    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)",
  },
};

const subMenuVariants: Variants = {
  closed: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.3 },
  },
  open: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const subItemVariants: Variants = {
  closed: { opacity: 0, x: -10 },
  open: { opacity: 1, x: 0 },
};

export const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebarCollapse();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [floatingMenu, setFloatingMenu] = useState<string | null>(null);
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setFloatingMenu(null);
  }, [location]);

  useEffect(() => {
    if (isCollapsed) {
      setHoveredItem(null);
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
      });
      document.dispatchEvent(event);
    }
  }, [isCollapsed]);

  if (!user) return null;

  const toggleGroup = (groupLabel: string) => {
    if (isCollapsed) {
      setFloatingMenu(floatingMenu === groupLabel ? null : groupLabel);
    } else {
      setExpandedGroups((prev) =>
        prev.includes(groupLabel)
          ? prev.filter((g) => g !== groupLabel)
          : [...prev, groupLabel]
      );
    }
  };

  const handleFloatingButtonClick = (path: string) => {
    navigate(path);
    setFloatingMenu(null);
  };

  const isPathActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const filteredSections = menuSections.filter((section) =>
    section.roles.includes(user.role as any)
  );

  let itemCounter = 0;

  const darkTheme = {
    bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900",
    border: "border-blue-500/20",
    text: "text-slate-300",
    textSecondary: "text-slate-400",
    hoverBg: "hover:bg-slate-700/50",
    activeBg: "bg-blue-500/20",
    activeBorder: "border-blue-500",
    activeText: "text-blue-300",
    logo: "bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600",
    glow: "bg-blue-500/5",
    glowPurple: "bg-purple-500/5",
    tooltipBg: "bg-blue-600",
    floatingBg: "bg-slate-800/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl",
  };

  const lightTheme = {
    bg: "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    border: "border-blue-200/50",
    text: "text-slate-700",
    textSecondary: "text-slate-600",
    hoverBg: "hover:bg-slate-200/50",
    activeBg: "bg-blue-100/60",
    activeBorder: "border-blue-500",
    activeText: "text-blue-600",
    logo: "bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500",
    glow: "bg-blue-400/5",
    glowPurple: "bg-purple-400/5",
    tooltipBg: "bg-blue-500",
    floatingBg: "bg-white/95 backdrop-blur-xl border border-blue-300/60 shadow-2xl",
  };

  const theme = isDark ? darkTheme : lightTheme;
  const textColor = isDark ? "text-white" : "text-slate-900";

  return (
    <>
      <AnimatePresence>
        {floatingMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFloatingMenu(null)}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarVariants}
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "fixed left-0 top-0 h-screen flex flex-col border-r z-40 overflow-hidden shadow-2xl transition-colors duration-300",
          theme.bg,
          theme.border,
          textColor
        )}
      >
        <div
          className={cn(
            "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none",
            theme.glow
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none",
            theme.glowPurple
          )}
        />

        {/* Logo Section */}
        <motion.div
          layout
          className={cn(
            "relative p-4 border-b flex items-center gap-3 z-20 transition-colors duration-300 flex-shrink-0",
            isDark
              ? "bg-gradient-to-b from-slate-950/80 to-slate-950/40 backdrop-blur-sm"
              : "bg-white/50 backdrop-blur-[2px]",
            theme.border
          )}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg flex-shrink-0",
              theme.logo
            )}
            whileHover={{
              rotate: 360,
              boxShadow: "0 0 30px rgba(59, 130, 246, 0.8)",
            }}
            transition={{ duration: 0.6 }}
          >
            W
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.1 }}
                className="min-w-0 flex-1"
              >
                <motion.h1
                  className={cn(
                    "font-bold text-lg transition-colors duration-300 truncate",
                    isDark
                      ? "bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                      : "text-blue-600"
                  )}
                >
                  WorkOS
                </motion.h1>
                <motion.p
                  className={cn(
                    "text-xs transition-colors duration-300 truncate",
                    isDark ? "text-blue-400/60" : "text-blue-500/70"
                  )}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Workspace
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <motion.nav
          layout
          className="flex-1 overflow-hidden z-20 relative"
          style={{ scrollbarWidth: "none" }}
        >
          <div
            className="h-full flex flex-col gap-4 py-4 px-3 overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`
              nav div::-webkit-scrollbar { display: none; }
              nav div { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {filteredSections.map((section, sectionIdx) => (
              <motion.div
                key={section.label}
                layout
                className="flex-shrink-0 relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sectionIdx * 0.1 }}
              >
                {!isCollapsed && (
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest px-3 mb-2 transition-colors duration-300",
                      isDark ? "text-blue-400/50" : "text-blue-500/60"
                    )}
                  >
                    {section.label}
                  </motion.p>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isGrouped = isGroupedMenuItem(item);
                    const isExpanded = expandedGroups.includes(item.label);
                    const isFloatingOpen = floatingMenu === item.label;
                    const currentIndex = itemCounter++;

                    if (isGrouped) {
                      return (
                        <motion.div key={item.label} layout className="relative">
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <motion.button
                                onClick={() => toggleGroup(item.label)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg relative group transition-all duration-300",
                                  theme.hoverBg,
                                  isFloatingOpen &&
                                    (isDark
                                      ? "bg-blue-500/20"
                                      : "bg-blue-100/60"),
                                  isCollapsed && "justify-center"
                                )}
                                whileHover="hover"
                                variants={itemVariants}
                                custom={currentIndex}
                                onHoverStart={() =>
                                  !isCollapsed && setHoveredItem(item.label)
                                }
                                onHoverEnd={() => setHoveredItem(null)}
                              >
                                <motion.div
                                  className="relative flex-shrink-0"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <div
                                    className={cn(
                                      "absolute inset-0 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                      isDark
                                        ? "bg-blue-500/20"
                                        : "bg-blue-400/20"
                                    )}
                                  />
                                  <item.icon className="w-5 h-5 relative z-10" />
                                </motion.div>

                                {!isCollapsed && (
                                  <>
                                    <motion.span
                                      className="flex-1 text-sm font-semibold text-left transition-colors duration-300 truncate"
                                      animate={{
                                        color:
                                          hoveredItem === item.label
                                            ? isDark
                                              ? "#3b82f6"
                                              : "#2563eb"
                                            : isDark
                                            ? "#e2e8f0"
                                            : "#334155",
                                      }}
                                    >
                                      {item.label}
                                    </motion.span>
                                    <motion.div
                                      animate={{
                                        rotate: isExpanded ? 180 : 0,
                                      }}
                                      transition={{ duration: 0.3 }}
                                      className="flex-shrink-0"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </motion.div>
                                  </>
                                )}
                              </motion.button>
                            </TooltipTrigger>
                            {isCollapsed && (
                              <TooltipContent
                                side="right"
                                className={theme.tooltipBg}
                                sideOffset={8}
                              >
                                {item.label}
                              </TooltipContent>
                            )}
                          </Tooltip>

                          <AnimatePresence mode="wait">
                            {isExpanded && !isCollapsed && (
                              <motion.div
                                variants={subMenuVariants}
                                initial="closed"
                                animate="open"
                                exit="closed"
                                className="overflow-hidden"
                              >
                                <div className="pl-10 space-y-2 mt-2">
                                  {item.subItems.map((subItem) => (
                                    <motion.div
                                      key={subItem.path}
                                      variants={subItemVariants}
                                    >
                                      <NavLink
                                        to={subItem.path}
                                        className={({ isActive }) =>
                                          cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm relative group transition-colors duration-300 min-w-0",
                                            isActive
                                              ? isDark
                                                ? "text-blue-300"
                                                : "text-blue-600"
                                              : isDark
                                              ? "text-slate-400"
                                              : "text-slate-600"
                                          )
                                        }
                                      >
                                        {({ isActive }) => (
                                          <>
                                            {isActive && (
                                              <motion.div
                                                layoutId="active-sub"
                                                className={cn(
                                                  "absolute inset-0 rounded-lg transition-colors duration-300",
                                                  isDark
                                                    ? "bg-blue-500/20"
                                                    : "bg-blue-100/60"
                                                )}
                                                transition={{
                                                  type: "spring",
                                                  stiffness: 300,
                                                  damping: 30,
                                                }}
                                              />
                                            )}
                                            <motion.div
                                              whileHover={{ scale: 1.1 }}
                                              className="relative z-10 flex-shrink-0"
                                            >
                                              <subItem.icon className="w-4 h-4" />
                                            </motion.div>
                                            <motion.span
                                              className={cn(
                                                "relative z-10 transition-colors duration-300 truncate",
                                                isDark
                                                  ? "group-hover:text-blue-300"
                                                  : "group-hover:text-blue-600"
                                              )}
                                            >
                                              {subItem.label}
                                            </motion.span>
                                          </>
                                        )}
                                      </NavLink>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    }

                    return (
                      <Tooltip key={item.label} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              cn(
                                "block transition-colors duration-300",
                                isActive
                                  ? isDark
                                    ? "text-blue-300"
                                    : "text-blue-600"
                                  : isDark
                                  ? "text-slate-300"
                                  : "text-slate-700"
                              )
                            }
                          >
                            {({ isActive }) => (
                              <motion.div
                                custom={currentIndex}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-3 rounded-lg relative group transition-colors duration-300 min-w-0",
                                  theme.hoverBg,
                                  isCollapsed && "justify-center"
                                )}
                                onHoverStart={() =>
                                  !isCollapsed && setHoveredItem(item.label)
                                }
                                onHoverEnd={() => setHoveredItem(null)}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="active-bg"
                                    className={cn(
                                      "absolute inset-0 rounded-lg transition-colors duration-300",
                                      isDark
                                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/10"
                                        : "bg-gradient-to-r from-blue-100/60 to-purple-100/30"
                                    )}
                                    transition={{
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 30,
                                    }}
                                  />
                                )}

                                <motion.div
                                  className="relative z-10 flex-shrink-0"
                                  whileHover={{ scale: 1.2, rotate: 10 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  {isActive && (
                                    <motion.div
                                      className={cn(
                                        "absolute inset-0 rounded-lg blur-md transition-colors duration-300",
                                        isDark
                                          ? "bg-blue-500/30"
                                          : "bg-blue-400/30"
                                      )}
                                      animate={{
                                        scale: [1, 1.2, 1],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                      }}
                                    />
                                  )}
                                  <item.icon className="w-5 h-5 relative z-10" />
                                </motion.div>

                                {!isCollapsed && (
                                  <motion.span
                                    className="text-sm font-semibold relative z-10 transition-colors duration-300 truncate flex-1"
                                    animate={{
                                      color:
                                        hoveredItem === item.label || isActive
                                          ? isDark
                                            ? "#3b82f6"
                                            : "#2563eb"
                                          : isDark
                                          ? "#cbd5e1"
                                          : "#475569",
                                    }}
                                  >
                                    {item.label}
                                  </motion.span>
                                )}

                                {isActive && !isCollapsed && (
                                  <motion.div
                                    animate={{
                                      x: [0, 4, 0],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                    }}
                                    className="ml-auto flex-shrink-0"
                                  >
                                    <Sparkles
                                      className={cn(
                                        "w-4 h-4 transition-colors duration-300",
                                        isDark
                                          ? "text-blue-400"
                                          : "text-blue-500"
                                      )}
                                    />
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent
                            side="right"
                            className={theme.tooltipBg}
                            sideOffset={8}
                          >
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.nav>

        {/* Settings Section - WITH TOOLTIP WHEN COLLAPSED */}
        <motion.div
          layout
          className={cn(
            "border-t px-3 py-3 relative z-20 transition-colors duration-300 flex-shrink-0",
            isDark
              ? "bg-gradient-to-t from-slate-950/80 to-slate-950/40 backdrop-blur-sm"
              : "bg-white/50 backdrop-blur-[2px]",
            theme.border
          )}
        >
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "block transition-colors duration-300",
                    isActive
                      ? isDark
                        ? "text-blue-300"
                        : "text-blue-600"
                      : theme.textSecondary
                  )
                }
              >
                {({ isActive }) => (
                  <motion.div
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg relative group transition-all duration-300",
                      theme.hoverBg,
                      isCollapsed && "justify-center"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className="w-5 h-5 relative z-10 flex-shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-sm font-semibold relative z-10 truncate"
                        >
                          Settings
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </NavLink>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className={theme.tooltipBg} sideOffset={8}>
                Settings
              </TooltipContent>
            )}
          </Tooltip>
        </motion.div>

        {/* Logout Section - WITH TOOLTIP WHEN COLLAPSED */}
        <motion.div
          layout
          className={cn(
            "border-t px-3 py-3 relative z-20 transition-colors duration-300 flex-shrink-0",
            isDark
              ? "bg-gradient-to-t from-slate-950/80 to-slate-950/40 backdrop-blur-sm"
              : "bg-white/50 backdrop-blur-[2px]",
            theme.border
          )}
        >
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg relative group transition-all duration-300",
                  isDark
                    ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    : "text-slate-600 hover:text-red-500 hover:bg-red-100",
                  isCollapsed && "justify-center"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="w-5 h-5 relative z-10 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-semibold relative z-10 truncate"
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent 
                side="right" 
                className={isDark ? "bg-red-600" : "bg-red-500"} 
                sideOffset={8}
              >
                Logout
              </TooltipContent>
            )}
          </Tooltip>
        </motion.div>

        {/* Collapse Button - DYNAMIC ICONS */}
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-full p-3 border-t flex items-center justify-center transition-all relative group flex-shrink-0 z-20",
            theme.border,
            isDark
              ? "hover:text-blue-400 text-slate-400 bg-gradient-to-t from-slate-950/80 to-slate-950/40"
              : "hover:text-blue-600 text-slate-600 bg-white/50 backdrop-blur-[2px]"
          )}
        >
          <motion.div
            animate={{
              rotate: isCollapsed ? 0 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </motion.div>
        </motion.button>
      </motion.aside>

      {/* FLOATING BUTTONS */}
      <AnimatePresence>
        {floatingMenu && isCollapsed && (
          <motion.div
            variants={floatingButtonsVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "fixed left-24 top-1/2 transform -translate-y-1/2 rounded-2xl p-6 z-50",
              theme.floatingBg
            )}
          >
            <div className="flex items-center justify-between mb-4 gap-2">
              <motion.h3
                className={cn(
                  "font-bold text-base transition-colors duration-300 truncate",
                  isDark ? "text-blue-300" : "text-blue-600"
                )}
              >
                {menuSections
                  .flatMap((s) => s.items)
                  .find(
                    (item) =>
                      isGroupedMenuItem(item) && item.label === floatingMenu
                  )?.label}
              </motion.h3>
              <motion.button
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setFloatingMenu(null)}
                className={cn(
                  "p-1 rounded-lg transition-colors flex-shrink-0",
                  isDark
                    ? "hover:bg-slate-700/50"
                    : "hover:bg-slate-200/50"
                )}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-3">
              {menuSections
                .flatMap((s) => s.items)
                .find(
                  (item) =>
                    isGroupedMenuItem(item) && item.label === floatingMenu
                )
                ?.subItems.map((subItem) => {
                  const isActive = isPathActive(subItem.path);
                  return (
                    <motion.button
                      key={subItem.path}
                      variants={floatingButtonVariants}
                      whileHover="hover"
                      onClick={() => handleFloatingButtonClick(subItem.path)}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap",
                        isActive
                          ? isDark
                            ? "bg-blue-500/30 text-blue-300"
                            : "bg-blue-100/80 text-blue-600"
                          : isDark
                          ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/60 hover:text-blue-300"
                          : "bg-slate-200/50 text-slate-700 hover:bg-blue-50/80 hover:text-blue-600"
                      )}
                    >
                      <subItem.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{subItem.label}</span>
                      {isActive && (
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="ml-auto flex-shrink-0"
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
