// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import Leave from "./pages/Leave";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

// NEW: import the Whiteboard page
import WhiteboardPage from "./pages/Whiteboard";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  
  // Developer gets the Developer Dashboard (platform-level admin)
  if (user?.role === 'developer') {
    return <DeveloperDashboard />;
  }
  
  // Admin gets the Admin Dashboard (company-level admin)
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  // Manager and Employee roles get the regular Dashboard
  return <Dashboard />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
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

        {/* NEW: Whiteboard routes */}
        <Route
          path="/whiteboard"
          element={
            <ProtectedRoute>
              <WhiteboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/whiteboard/:id"
          element={
            <ProtectedRoute>
              <WhiteboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
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

      {/* NEW: Allow authenticated users to reach whiteboard even when on public (if they later login) */}
      <Route
        path="/whiteboard"
        element={
          <ProtectedRoute>
            <WhiteboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whiteboard/:id"
        element={
          <ProtectedRoute>
            <WhiteboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
