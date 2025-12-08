// src/hooks/useProtectedRoute.ts

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { UserRole } from '@/types/workos';

export const useProtectedRoute = (requiredRole?: UserRole) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      navigate('/unauthorized');
      return;
    }
  }, [isAuthenticated, user, requiredRole, navigate]);

  return { user, isAuthenticated };
};

// Usage in component
const AdminDashboard = () => {
  const { user } = useProtectedRoute('admin');

  if (!user) return null;

  return <div>Welcome {user.full_name}!</div>;
};
