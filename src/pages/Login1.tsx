import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext1';
import { UserRole } from '@/types/workos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Building2, Users, UserCheck, Code } from 'lucide-react';

const roles: { value: UserRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'developer', label: 'Developer', icon: Code, description: 'Platform administration' },
  { value: 'admin', label: 'Admin', icon: Building2, description: 'Company management' },
  { value: 'manager', label: 'Manager', icon: Users, description: 'Team oversight' },
  { value: 'employee', label: 'Employee', icon: UserCheck, description: 'Personal access' },
];

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'role'>('credentials');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    setStep('role');
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login(email, password, selectedRole);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${selectedRole}`,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background animated-bg p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-r from-primary/20 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-l from-accent/20 to-transparent blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow"
            >
              <span className="text-2xl font-bold text-primary-foreground">W</span>
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold text-gradient">WorkOS</CardTitle>
              <CardDescription>Workforce Operating System</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 'credentials' ? (
                <motion.form
                  key="credentials"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-input" />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <a href="#" className="text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" size="lg">
                    Continue
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground">Select your role to continue</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {roles.map((role, index) => {
                      const Icon = role.icon;
                      return (
                        <motion.button
                          key={role.value}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setSelectedRole(role.value)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            selectedRole === role.value
                              ? 'border-primary bg-primary/10 shadow-soft'
                              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                          }`}
                        >
                          {selectedRole === role.value && (
                            <motion.div
                              layoutId="roleIndicator"
                              className="absolute inset-0 rounded-xl border-2 border-primary"
                              transition={{ type: 'spring', duration: 0.3 }}
                            />
                          )}
                          <Icon className={`h-6 w-6 mb-2 ${selectedRole === role.value ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep('credentials')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{' '}
          <a href="#" className="text-primary hover:underline">
            Contact Admin
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
