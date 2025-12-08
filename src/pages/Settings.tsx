// src/pages/Settings.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Camera,
  Save,
} from 'lucide-react';

// Theme (optional - guard if provider missing)
import type { ThemeChoice } from "@/contexts/ThemeContext";
import { useTheme } from "@/contexts/ThemeContext";

const Settings: React.FC = () => {
  const { user } = useAuth();

  // --- Theme hookup (defensive) ---
  // `useTheme()` will throw if the ThemeProvider is not mounted.
  // So we call it inside try/catch. If it fails, we fall back to defaults.
  let themeCtx: {
    choice?: ThemeChoice;
    setChoice?: (c: ThemeChoice) => void;
    isDark?: boolean;
  } = {};
  try {
    // If ThemeProvider exists this returns the real context
    themeCtx = useTheme();
  } catch (err) {
    // ThemeProvider not present or import path incorrect — we'll degrade gracefully.
    themeCtx = { choice: "system", setChoice: () => {}, isDark: false };
  }

  const initialThemeChoice: ThemeChoice = (themeCtx.choice as ThemeChoice) || "system";
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(initialThemeChoice);
  const [mounted, setMounted] = useState(false);

  // After mount, sync to context (this avoids SSR / document issues and ensures no crash)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only call context setter if available
    if (!mounted) return;
    if (themeCtx.setChoice) themeCtx.setChoice(themeChoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeChoice, mounted]);

  // Use the context's isDark if available
  const themeIsDark = !!themeCtx.isDark;

  // --- Profile & Notifications state (unchanged behaviour) ---
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '+1 234 567 890',
    department: user?.department || '',
    designation: user?.designation || '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    leaveApproval: true,
    taskAssignment: true,
    payrollUpdates: true,
  });

  const handleSaveProfile = () => {
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully',
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: 'Preferences Saved',
      description: 'Your notification preferences have been updated',
    });
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user?.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </div>

                {/* Form */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="gradient" onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>Select which notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Leave Approvals</p>
                    <p className="text-sm text-muted-foreground">Get notified about leave status</p>
                  </div>
                  <Switch
                    checked={notifications.leaveApproval}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, leaveApproval: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Assignments</p>
                    <p className="text-sm text-muted-foreground">Get notified when tasks are assigned</p>
                  </div>
                  <Switch
                    checked={notifications.taskAssignment}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, taskAssignment: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payroll Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified about salary processing</p>
                  </div>
                  <Switch
                    checked={notifications.payrollUpdates}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, payrollUpdates: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="gradient" onClick={handleSaveNotifications}>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button variant="gradient">Update Password</Button>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Shield className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-sm text-muted-foreground">Secure your account with 2FA</p>
                    </div>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-success/10">
                        <Globe className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Chrome on Windows • New York, US</p>
                      </div>
                    </div>
                    <span className="text-xs text-success">Active now</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Customize the appearance of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Color Scheme</Label>
                  {/* render the Select only after mount to avoid any SSR/undefined issues */}
                  {mounted ? (
                    <Select value={themeChoice} onValueChange={(v) => setThemeChoice(v as ThemeChoice)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select defaultValue="utc-5">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="utc+0">UTC</SelectItem>
                      <SelectItem value="utc+5.5">India Standard Time (UTC+5:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Current effective theme: <strong className="ml-2">{themeIsDark ? "Dark" : "Light"}</strong>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;
