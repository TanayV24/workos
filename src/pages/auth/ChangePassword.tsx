// src/pages/auth/ChangePassword.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: '',
  });

  const navigate = useNavigate();
  const { user, updateUserData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (passwords.new !== passwords.confirm) {
        toast({
          title: 'Error',
          description: 'New passwords do not match',
          variant: 'destructive',
        });
        return;
      }

      await api.changePassword(passwords.old, passwords.new);

      updateUserData({ temp_password: false });

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Change Password</h1>
        <p className="text-muted-foreground mb-6">
          This is your first login. Please set a permanent password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="space-y-2">
            <label>Current Password</label>
            <div className="relative">
              <Input
                type={showOld ? 'text' : 'password'}
                value={passwords.old}
                onChange={(e) =>
                  setPasswords({ ...passwords, old: e.target.value })
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showOld ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label>New Password</label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showNew ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label>Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
