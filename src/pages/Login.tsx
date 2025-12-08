// src/pages/Login.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/workos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Building2, Users, UserCheck, Code, Loader2 } from 'lucide-react';

interface LoginCredentials {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'confirmation'>('credentials');
  const [loginAttempt, setLoginAttempt] = useState<{
    email: string;
    role: UserRole;
  } | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call backend login
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          role: 'admin', // Default to admin for now
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens and user info in context
      await login(
        credentials.email,
        credentials.password,
        data.data.user.role as UserRole
      );

      // Store additional user data
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data.data.user.id,
          email: data.data.user.email,
          full_name: data.data.user.full_name,
          role: data.data.user.role,
          company_id: data.data.user.company_id,
          company_name: data.data.user.company_name,
          temp_password: data.data.user.temp_password,
        })
      );

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);

      // Store tokens in AuthContext
      const authData = {
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        user: data.data.user,
      };

      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.data.user.full_name}`,
      });

      // Set confirmation and redirect
      setLoginAttempt({
        email: credentials.email,
        role: data.data.user.role as UserRole,
      });

      // If temp password, redirect to change password page
      if (data.data.user.temp_password) {
        setTimeout(() => {
          navigate('/auth/change-password');
        }, 1500);
      } else {
        // Otherwise redirect to role-specific dashboard
        setTimeout(() => {
          if (data.data.user.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (data.data.user.role === 'employee') {
            navigate('/employee/dashboard');
          } else if (data.data.user.role === 'manager') {
            navigate('/manager/dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description:
          error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-sm bg-background/80 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">WorkOS</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Workforce Operating System
            </p>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === 'credentials' ? (
                <motion.form
                  key="credentials"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-4"
                >
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@company.com"
                        value={credentials.email}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            email: e.target.value,
                          })
                        }
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={credentials.password}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            password: e.target.value,
                          })
                        }
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember & Forgot */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-primary"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </motion.form>
              ) : null}
            </AnimatePresence>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <a href="/register" className="text-primary hover:underline font-medium">
                Create Company
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
