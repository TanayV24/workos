// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import Leave from "./pages/Leave";
import Settings from "./pages/Settings";
import WhiteboardPage from "./pages/Whiteboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ============================================
// DASHBOARD ROUTER - Route by User Role
// ============================================

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  // Developer gets the Developer Dashboard (platform-level admin)
  if (user?.role === "developer") {
    return <DeveloperDashboard />;
  }

  // Admin gets the Admin Dashboard (company-level admin)
  if (user?.role === "admin") {
    return <AdminDashboard />;
  }

  // Manager and Employee roles get the regular Dashboard
  return <Dashboard />;
};

// ============================================
// APP ROUTES CONTENT (INSIDE AuthProvider)
// ============================================

const AppRoutesContent = () => {
  const { isAuthenticated } = useAuth();

  // If authenticated, show protected routes
  if (isAuthenticated) {
    return (
      <Routes>
        {/* Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        {/* Employee Management */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />

        {/* Attendance */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />

        {/* Tasks */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        {/* Leave */}
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <Leave />
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Whiteboard */}
        <Route
          path="/whiteboard"
          element={
            <ProtectedRoute>
              <WhiteboardPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Redirect login to dashboard if already authenticated */}
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // If not authenticated, show public routes
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Index />} />

      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Whiteboard (accessible even without login for preview) */}
      <Route path="/whiteboard" element={<WhiteboardPage />} />

      {/* Redirect authenticated attempts to protected routes to login */}
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      <Route path="/employees" element={<Navigate to="/login" replace />} />
      <Route path="/attendance" element={<Navigate to="/login" replace />} />
      <Route path="/tasks" element={<Navigate to="/login" replace />} />
      <Route path="/leave" element={<Navigate to="/login" replace />} />
      <Route path="/settings" element={<Navigate to="/login" replace />} />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutesContent />
          <Toaster />
          <Sonner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;