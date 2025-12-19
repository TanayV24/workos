// src/App.tsx - MINIMAL CHANGES ONLY

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

import Index from './pages/Index';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './Dashboards/Dashboard';
import AdminDashboard from './Dashboards/AdminDashboard';
import ManagerDashboard from './Dashboards/ManagerDashboard'; // NEW
import MainDashboard from './Dashboards/MainDashboard'; // ← ADD THIS (NEW IMPORT)
import Onboarding from './pages/Onboarding';
import ProfileCompletion from './pages/ProfileCompletion';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Leave from './pages/Leave';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import ChatPage from './pages/ChatPage';
import WhiteboardPage from './pages/Whiteboard';

const queryClient = new QueryClient();

// PROTECTED ROUTE COMPONENT
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user) return;

    const currentPath = window.location.pathname;

    // COMPANY ADMIN FLOW
    if (user.role === 'company_admin') {
      // Step 1: Temp password? Change password page
      if (user.temp_password === true) {
        if (currentPath !== '/auth/change-password') {
          console.log('Admin: Temp password detected → change-password');
          navigate('/auth/change-password', { replace: true });
        }
        return;
      }

      // Step 2: Company setup not completed? Onboarding page
      if (user.company_setup_completed === false) {
        if (currentPath !== '/onboarding') {
          console.log('Admin: Setup not completed → onboarding');
          navigate('/onboarding', { replace: true });
        }
        return;
      }

      // Step 3: All done, don't go back to setup
      if (
        user.company_setup_completed === true &&
        currentPath === '/onboarding'
      ) {
        console.log('Admin: Setup complete → admin/dashboard');
        navigate('/admin/dashboard', { replace: true });
        return;
      }
    }

    // MANAGER FLOW (NEW) ⭐
    if (user.role === 'manager') {
      // Step 1: Temp password? Change password page
      if (user.temp_password === true) {
        if (currentPath !== '/users/change-password') {
          console.log('Manager: Temp password detected → change-password');
          navigate('/users/change-password', { replace: true });
        }
        return;
      }

      // Step 2: Profile not completed? Profile completion page
      if (user.profile_completed === false) {
        if (currentPath !== '/profile-completion') {
          console.log('Manager: Profile not completed → profile-completion');
          navigate('/profile-completion', { replace: true });
        }
        return;
      }

      // Step 3: All done, route to manager dashboard
      if (
        user.profile_completed === true &&
        currentPath === '/profile-completion'
      ) {
        console.log('Manager: Profile complete → managerdashboard');
        navigate('/ManagerDashboard', { replace: true });
        return;
      }
    }

    // HR MANAGER FLOW
    if (user.role === 'hr') {
      // Step 1: Temp password? Change password page
      if (user.temp_password === true) {
        if (currentPath !== '/users/change-password') {
          console.log('HR: Temp password detected → change-password');
          navigate('/users/change-password', { replace: true });
        }
        return;
      }

      // Step 2: Profile not completed? Profile completion page
      if (user.profile_completed === false) {
        if (currentPath !== '/profile-completion') {
          console.log('HR: Profile not completed → profile-completion');
          navigate('/profile-completion', { replace: true });
        }
        return;
      }

      // Step 3: All done, route to dashboard
      if (
        user.profile_completed === true &&
        currentPath === '/profile-completion'
      ) {
        console.log('HR: Profile complete → dashboard');
        navigate('/ManagerDashboard', { replace: true });
        return;
      }
    }

    // EMPLOYEE / TEAM LEAD FLOW
    if (['employee', 'team_lead'].includes(user.role)) {
      // Step 1: Temp password? Change password page
      if (user.temp_password === true) {
        if (currentPath !== '/users/change-password') {
          console.log('Employee: Temp password detected → change-password');
          navigate('/users/change-password', { replace: true });
        }
        return;
      }

      // Step 2: Profile not completed? Profile completion page
      if (user.profile_completed === false) {
        if (currentPath !== '/profile-completion') {
          console.log('Employee: Profile not completed → profile-completion');
          navigate('/profile-completion', { replace: true });
        }
        return;
      }

      // Step 3: All done, route to dashboard
      if (
        user.profile_completed === true &&
        currentPath === '/profile-completion'
      ) {
        console.log('Employee: Profile complete → dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
    }
  }, [user, navigate, loading, isAuthenticated]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
};

// APP CONTENT COMPONENT
const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      {/* CHANGE PASSWORD - Accessible to all authenticated users */}
      <Route
        path="/auth/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* MAIN DASHBOARD - SMART ROUTER (CHANGED FROM Dashboard TO MainDashboard) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainDashboard /> {/* ← CHANGED: Now routes based on user role */}
          </ProtectedRoute>
        }
      />

      {/* ADMIN DASHBOARD */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* MANAGER DASHBOARD */}
      <Route
        path="/ManagerDashboard"
        element={
          <ProtectedRoute>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      {/* EMPLOYEE DASHBOARD */}
      <Route
        path="/employee-dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ONBOARDING */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* PROFILE COMPLETION */}
      <Route
        path="/profile-completion"
        element={
          <ProtectedRoute>
            <ProfileCompletion />
          </ProtectedRoute>
        }
      />

      {/* EMPLOYEES */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <Employees />
          </ProtectedRoute>
        }
      />

      {/* TASKS */}
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />

      {/* LEAVE */}
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <Leave />
          </ProtectedRoute>
        }
      />

      {/* ATTENDANCE */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* SETTINGS */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* CHAT */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* WHITEBOARD */}
      <Route
        path="/whiteboard"
        element={
          <ProtectedRoute>
            <WhiteboardPage />
          </ProtectedRoute>
        }
      />

      {/* CATCH ALL - REDIRECT TO HOME */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// MAIN APP COMPONENT
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              <AppContent />
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;