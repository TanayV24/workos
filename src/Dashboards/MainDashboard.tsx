import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const MainDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  switch (user?.role) {
    case 'company_admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'manager':
    case 'hr':
      return <Navigate to="/ManagerDashboard" replace />;
    case 'employee':
    case 'team_lead':
      return <Navigate to="/employee-dashboard" replace />;
    default:
      return <Navigate to="/admin/dashboard" replace />;
  }
};

export default MainDashboard;
