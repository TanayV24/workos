import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/workos';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: Record<UserRole, User> = {
  developer: {
    id: 'dev-001',
    name: 'Alex Developer',
    email: 'alex@workos.dev',
    role: 'developer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    department: 'Engineering',
    designation: 'Platform Admin',
    status: 'active',
  },
  admin: {
    id: 'admin-001',
    name: 'Sarah Admin',
    email: 'sarah@company.com',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    department: 'Administration',
    designation: 'HR Director',
    status: 'active',
  },
  manager: {
    id: 'mgr-001',
    name: 'Michael Manager',
    email: 'michael@company.com',
    role: 'manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    department: 'Operations',
    designation: 'Team Lead',
    status: 'active',
  },
  employee: {
    id: 'emp-001',
    name: 'Emma Employee',
    email: 'emma@company.com',
    role: 'employee',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    department: 'Marketing',
    designation: 'Marketing Executive',
    status: 'active',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser(mockUsers[role]);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setUser(mockUsers[role]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
