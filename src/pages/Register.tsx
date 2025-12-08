// src/pages/Register.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Building2, Loader2, ChevronLeft } from 'lucide-react';

interface CompanyData {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timezone: string;
  currency: string;
}

const Register: React.FC = () => {
  const [step, setStep] = useState<'company' | 'admin'>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });

  const [adminData, setAdminData] = useState({
    full_name: '',
    personal_email: '',
    phone: '',
  });

  const navigate = useNavigate();

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/companies/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register company');
      }

      setCompanyId(data.data.id);
      setStep('admin');

      toast({
        title: 'Company Created',
        description: 'Now create the admin account',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to register company',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/create-admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          full_name: adminData.full_name,
          personal_email: adminData.personal_email,
          phone: adminData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create admin');
      }

      toast({
        title: 'Success!',
        description: `Credentials sent to ${adminData.personal_email}. Check your email!`,
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create admin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <Card className="backdrop-blur-sm bg-background/80 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Create Company</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {step === 'company'
                ? 'Step 1: Company Information'
                : 'Step 2: Admin Account'}
            </p>
          </CardHeader>

          <CardContent>
            {step === 'company' ? (
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    placeholder="TechCorp Solutions"
                    value={companyData.name}
                    onChange={(e) =>
                      setCompanyData({ ...companyData, name: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      value={companyData.email}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+91-9876543210"
                      value={companyData.phone}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Website & Address */}
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    placeholder="https://company.com"
                    value={companyData.website}
                    onChange={(e) =>
                      setCompanyData({
                        ...companyData,
                        website: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="123 Business Street"
                    value={companyData.address}
                    onChange={(e) =>
                      setCompanyData({
                        ...companyData,
                        address: e.target.value,
                      })
                    }
                  />
                </div>

                {/* City, State, Country, Pincode */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      placeholder="Bangalore"
                      value={companyData.city}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      placeholder="Karnataka"
                      value={companyData.state}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={companyData.country}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          country: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      placeholder="560001"
                      value={companyData.pincode}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          pincode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Timezone & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={companyData.timezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">
                          Asia/Kolkata (IST)
                        </SelectItem>
                        <SelectItem value="Asia/Bangkok">
                          Asia/Bangkok
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={companyData.currency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Company'
                  )}
                </Button>
              </form>
            ) : (
              // Admin Form
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Create the admin account. Credentials will be sent to the
                  personal email you provide.
                </p>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Rajesh Kumar"
                    value={adminData.full_name}
                    onChange={(e) =>
                      setAdminData({
                        ...adminData,
                        full_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Personal Email */}
                <div className="space-y-2">
                  <Label>Personal Email * (where credentials will be sent)</Label>
                  <Input
                    type="email"
                    placeholder="rajesh@gmail.com"
                    value={adminData.personal_email}
                    onChange={(e) =>
                      setAdminData({
                        ...adminData,
                        personal_email: e.target.value,
                      })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Use your real personal email. You'll receive login
                    credentials here.
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input
                    placeholder="+91-9876543210"
                    value={adminData.phone}
                    onChange={(e) =>
                      setAdminData({ ...adminData, phone: e.target.value })
                    }
                  />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('company')}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Admin'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline font-medium">
                Sign In
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
