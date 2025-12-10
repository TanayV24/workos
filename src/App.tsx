import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React from "react";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
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
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      const needsOnboarding = user.temp_password || user.company_setup_completed === false;
      const isOnOnboardingPage = window.location.pathname === "/onboarding";
      const isOnChangePasswordPage = window.location.pathname === "/auth/change-password";

      if (needsOnboarding && !isOnOnboardingPage && !isOnChangePasswordPage) {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const needsOnboarding = user?.temp_password || user?.company_setup_completed === false;
  const isOnOnboardingPage = window.location.pathname === "/onboarding";
  const isOnChangePasswordPage = window.location.pathname === "/auth/change-password";

  if (needsOnboarding && !isOnOnboardingPage && !isOnChangePasswordPage) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

// ============================================
// MAIN APP COMPONENT
// ============================================

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* DEFAULT HOST ROUTE -> your landing page */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Index /> // your landing page
          )
        }
      />

      {/* Public login route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Change Password Route */}
      <Route
        path="/auth/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Developer Routes */}
      <Route
        path="/developer/dashboard"
        element={
          <ProtectedRoute>
            <DeveloperDashboard />
          </ProtectedRoute>
        }
      />

      {/* General Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <Employees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <Leave />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/whiteboard"
        element={
          <ProtectedRoute>
            <WhiteboardPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
            <Toaster />
            <Sonner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;