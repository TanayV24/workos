import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import {
  Building2,
  Users,
  UserCheck,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react'
import { authRest } from '@/services/api'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface CompanySetupData {
  companyname: string
  companywebsite: string
  companyindustry: string
  timezone: string
  currency: string

  totalemployees: number

  work_type: 'fixed_hours' | 'shift_based';  // Change from worktype'

  workinghoursstart: string
  workinghoursend: string

  shift_duration_minutes: number | null

  break_minutes: number

  casualleavedays: number
  sickleavedays: number
  personalleavedays: number
}

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface HRForm {
  name: string
  email: string
}

interface ManagerForm {
  name: string
  email: string
}

interface Shift {
  work_type: 'fixed_hours' | 'shift_based'
  name: string
  startTime?: string
  endTime?: string
  requiredHours?: number
  description?: string
  is_default?: boolean
}

// ==========================================
// MAIN COMPONENT
// ==========================================

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateUserData } = useAuth()

  React.useEffect(() => {
    if (user?.role !== 'company_admin') {
      window.location.href = '/dashboard'
    }
  }, [user?.role])

  const [onboardingStep, setOnboardingStep] = useState<
    'password' | 'company' | 'complete'
  >('password')
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [activeTab, setActiveTab] = useState<'info' | 'details' | 'managers' | 'review'>(
    'info'
  )
  const [setupForm, setSetupForm] = useState<CompanySetupData>({
    companyname: '',
    companywebsite: '',
    companyindustry: 'IT Services',
    timezone: 'IST',
    currency: 'INR',
    totalemployees: 1,
    work_type: 'fixed_hours',
    workinghoursstart: '09:00',
    workinghoursend: '18:00',
    shift_duration_minutes: 480,
    break_minutes: 60,
    casualleavedays: 12,
    sickleavedays: 6,
    personalleavedays: 2,
  })

  const [hrForm, setHrForm] = useState<HRForm>({ name: '', email: '' })
  const [managerForm, setManagerForm] = useState<ManagerForm>({
    name: '',
    email: '',
  })

  const [addedHR, setAddedHR] = useState<HRForm | null>(null)
  const [addedManager, setAddedManager] = useState<ManagerForm | null>(null)

  const [addingHR, setAddingHR] = useState(false)
  const [addingManager, setAddingManager] = useState(false)
  const [completingSetup, setCompletingSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [shifts, setShifts] = useState<Shift[]>([
    { work_type: setupForm.work_type, name: '', startTime: '', endTime: '', description: '' },
  ])
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(0)

  // either "duration" or "shifts"
  const [shiftConfigMode, setShiftConfigMode] = useState<'duration' | 'shifts'>('duration')

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        if (userData.temp_password === true) {
          setOnboardingStep('password')
        } else if (userData.company_setup_completed === false) {
          setOnboardingStep('company')
        } else {
          setOnboardingStep('complete')
        }
      } catch (error) {
        console.error('Error parsing user:', error)
      }
    }
    setIsCheckingStatus(false)
  }, [])

  useEffect(() => {
    if (!isCheckingStatus && onboardingStep === 'complete') {
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true })
      }, 500)
    }
  }, [onboardingStep, isCheckingStatus, navigate])

  // ==========================================
  // HANDLERS
  // ==========================================

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      })
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await authRest.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      toast({
        title: 'Success!',
        description: 'Your password has been changed successfully',
      })

      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        userData.temp_password = false
        localStorage.setItem('user', JSON.stringify(userData))
        updateUserData({ temp_password: false })
        if (userData.company_setup_completed === false) {
          setOnboardingStep('company')
        } else {
          setOnboardingStep('complete')
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupInputChange = (
    field: keyof CompanySetupData,
    value: any
  ) => {
    setSetupForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleHRInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setHrForm({ ...hrForm, [name]: value })
  }

  const handleManagerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setManagerForm({ ...managerForm, [name]: value })
  }

  const handleAddShift = () => {
    setShifts([
      ...shifts,
      {
        work_type: setupForm.work_type,
        name: '',
        startTime: '',
        endTime: '',
        description: '',
      },
    ])
  }

  const handleRemoveShift = (index: number) => {
    const newShifts = shifts.filter((_, i) => i !== index)
    setShifts(newShifts)
    if (selectedShiftIndex === index) {
      setSelectedShiftIndex(0)
    }
  }

  const handleShiftChange = (index: number, field: string, value: any) => {
    const newShifts = [...shifts]
    newShifts[index] = { ...newShifts[index], [field]: value }
    setShifts(newShifts)
  }

  const handleCreateShifts = async (companyId: string) => {
    if (setupForm.work_type === 'shift_based' && shiftConfigMode === 'duration') {
      // overall duration only, no detailed shifts
      return true
    }

    for (let shift of shifts) {
      if (!shift.name) {
        toast({
          title: 'Error',
          description: 'Please fill in all shift names',
          variant: 'destructive',
        })
        return false
      }
      if (!shift.startTime || !shift.endTime) {
        toast({
          title: 'Error',
          description: 'Please fill in start and end times for all shifts',
          variant: 'destructive',
        })
        return false
      }
    }

    try {
      const data = await authRest.createShifts(
        companyId,
        shifts.map((s) => ({
          work_type: s.work_type,
          name: s.name,
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          required_hours_per_day:
            s.work_type === 'shift_based'
              ? parseFloat((s.requiredHours || 0).toString()) || null
              : null,
          description: s.description,
        }))
      )

      if (data.success) {
        localStorage.setItem('default_shift_id', data.shifts[selectedShiftIndex].id)
        return true
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        })
        return false
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      })
      return false
    }
  }

  const handleAddHR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hrForm.name || !hrForm.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }
    setAddingHR(true)
    try {
      await authRest.addHR(hrForm.name, hrForm.email)
      toast({
        title: 'Success!',
        description: `${hrForm.name} has been added as HR Manager`,
      })
      setAddedHR({ ...hrForm })
      setHrForm({ name: '', email: '' })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to add HR',
        variant: 'destructive',
      })
    } finally {
      setAddingHR(false)
    }
  }

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerForm.name || !managerForm.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }
    setAddingManager(true)
    try {
      await authRest.addManager(managerForm.name, managerForm.email, 'manager')
      toast({
        title: 'Success!',
        description: `${managerForm.name} has been added as Manager`,
      })
      setAddedManager({ ...managerForm })
      setManagerForm({ name: '', email: '' })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to add Manager',
        variant: 'destructive',
      })
    } finally {
      setAddingManager(false)
    }
  }


  
 const handleCompanySetup = async () => {
  if (!setupForm.companyname.trim()) {
    toast({
      title: 'Error',
      description: 'Company name is required',
      variant: 'destructive',
    })
    return
  }

  // Validate shift configuration
  if (setupForm.work_type === 'shift_based') {
    if (shiftConfigMode === 'duration') {
      if (!setupForm.shift_duration_minutes || setupForm.shift_duration_minutes <= 0) {
        toast({
          title: 'Error',
          description: 'Shift duration must be greater than 0 minutes',
          variant: 'destructive',
        })
        return
      }
    } else if (shiftConfigMode === 'shifts') {
      if (shifts.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one shift',
          variant: 'destructive',
        })
        return
      }
      
      for (let shift of shifts) {
        if (!shift.name) {
          toast({
            title: 'Error',
            description: 'Please fill in all shift names',
            variant: 'destructive',
          })
          return
        }
        if (!shift.startTime || !shift.endTime) {
          toast({
            title: 'Error',
            description: 'Please fill in start and end times for all shifts',
            variant: 'destructive',
          })
          return
        }
      }
    }
  }

  setCompletingSetup(true)
  try {
    let websiteUrl = setupForm.companywebsite.trim()
    if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = `https://${websiteUrl}`
    }
    console.log('🔍 DEBUG: shifts state =', shifts);  // ADD THIS LINE

    const payload: any = {
      companyname: setupForm.companyname,
      companywebsite: websiteUrl,
      companyindustry: setupForm.companyindustry,
      timezone: setupForm.timezone,
      currency: setupForm.currency,
      totalemployees: setupForm.totalemployees,
      work_type: setupForm.work_type,
      break_minutes: setupForm.break_minutes,
      casualleavedays: setupForm.casualleavedays,
      sickleavedays: setupForm.sickleavedays,
      personalleavedays: setupForm.personalleavedays,
      shift_duration_minutes: setupForm.shift_duration_minutes, // for scenario 2        
      workinghoursstart: setupForm.workinghoursstart,           // for scenario 1
      workinghoursend: setupForm.workinghoursend,

      shifts: shifts.map(shift => ({
        name: shift.name,
        startTime: shift.startTime,      // ✅ CRITICAL
        endTime: shift.endTime,          // ✅ CRITICAL
        requiredHours: shift.requiredHours,
        description: shift.description,
        is_default: shift.is_default,
      })),
    }

    console.log('📤 Payload being sent:', JSON.stringify(payload, null, 2));  // ADD THIS
    // Add data based on work type AND shift config mode
    if (setupForm.work_type === 'fixed_hours') {
      payload.workinghoursstart = setupForm.workinghoursstart
      payload.workinghoursend = setupForm.workinghoursend
    } else if (setupForm.work_type === 'shift_based') {
      if (shiftConfigMode === 'duration') {
        // Scenario 2: Only shift duration
        payload.shift_duration_minutes = setupForm.shift_duration_minutes
      } else if (shiftConfigMode === 'shifts') {
        // Scenario 3: Detailed shifts array
        payload.shifts = shifts.map((s) => ({
          work_type: s.work_type,
          name: s.name,
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          requiredhoursperday: s.requiredHours ? Number(s.requiredHours) : null,
          description: s.description || null,
        }))
      }
    }

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2))

    const response = await authRest.companySetup(payload)

    console.log('✅ Setup response:', response)

    toast({
      title: 'Success!',
      description: 'Company setup completed! Redirecting to dashboard...',
    })

    updateUserData({ company_setup_completed: true })
    setOnboardingStep('complete')
  } catch (error) {
    console.error('❌ Setup error:', error)
    toast({
      title: 'Error',
      description:
        error instanceof Error ? error.message : 'Failed to save setup',
      variant: 'destructive',
    })
  } finally {
    setCompletingSetup(false)
  }
}



  // ==========================================
  // RENDER
  // ==========================================

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border border-slate-700">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-lg font-semibold text-slate-100">
              Setting up your account...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (onboardingStep === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-slate-800 border border-slate-700">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <Lock className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">Change Your Password</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Step 1 of 2</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="mb-6">
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-100">
                    Temporary Password Detected
                  </p>
                  <p className="text-sm text-amber-200">
                    You must change your password before continuing
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentpassword" className="text-slate-200">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentpassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newpassword" className="text-slate-200">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newpassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  At least 8 characters recommended
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmpassword" className="text-slate-200">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmpassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password & Continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================
  // COMPANY SETUP UI
  // ==========================================

  if (onboardingStep === 'company') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl bg-slate-800 border border-slate-700">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">Welcome to WorkOS</CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  Let's set up your company (Step 2 of 2)
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
            >
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-700">
                <TabsTrigger
                  value="info"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600 text-slate-200 data-[state=active]:text-white"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600 text-slate-200 data-[state=active]:text-white"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="managers"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600 text-slate-200 data-[state=active]:text-white"
                >
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Managers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600 text-slate-200 data-[state=active]:text-white"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Review</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: INFO */}
              <TabsContent value="info" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyname" className="text-slate-200">
                    Company Name
                  </Label>
                  <Input
                    id="companyname"
                    placeholder="e.g., TechCorp India"
                    value={setupForm.companyname}
                    onChange={(e) =>
                      handleSetupInputChange('companyname', e.target.value)
                    }
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companywebsite" className="text-slate-200">
                    Company Website
                  </Label>
                  <Input
                    id="companywebsite"
                    placeholder="e.g., https://techcorp.com"
                    type="url"
                    value={setupForm.companywebsite}
                    onChange={(e) =>
                      handleSetupInputChange('companywebsite', e.target.value)
                    }
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyindustry" className="text-slate-200">
                    Industry
                  </Label>
                  <select
                    id="companyindustry"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-700 border-slate-600 text-slate-100"
                    value={setupForm.companyindustry}
                    onChange={(e) =>
                      handleSetupInputChange(
                        'companyindustry',
                        e.target.value
                      )
                    }
                  >
                    <option>IT Services</option>
                    <option>Manufacturing</option>
                    <option>Retail</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Education</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-slate-200">
                      Timezone
                    </Label>
                    <select
                      id="timezone"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-700 border-slate-600 text-slate-100"
                      value={setupForm.timezone}
                      onChange={(e) =>
                        handleSetupInputChange('timezone', e.target.value)
                      }
                    >
                      <option value="IST">IST (India)</option>
                      <option value="UTC">UTC</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-200">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-700 border-slate-600 text-slate-100"
                      value={setupForm.currency}
                      onChange={(e) =>
                        handleSetupInputChange('currency', e.target.value)
                      }
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={() => setActiveTab('details')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next: Company Details
                </Button>
              </TabsContent>

              {/* TAB 2: DETAILS */}
              <TabsContent value="details" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="totalemployees" className="text-slate-200">
                    Total Employees
                  </Label>
                  <Input
                    id="totalemployees"
                    type="number"
                    min={1}
                    value={setupForm.totalemployees}
                    onChange={(e) =>
                      handleSetupInputChange(
                        'totalemployees',
                        parseInt(e.target.value || '1', 10)
                      )
                    }
                    className="bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>

                {/* Work pattern */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Work Pattern</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleSetupInputChange('work_type', 'fixed_hours')
                      }
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm font-medium transition ${
                        setupForm.work_type === 'fixed_hours'
                          ? 'border-blue-500 bg-blue-900/30 text-blue-200'
                          : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      Standard Office Hours
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSetupInputChange('work_type', 'shift_based')
                      }
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm font-medium transition ${
                        setupForm.work_type === 'shift_based'
                          ? 'border-blue-500 bg-blue-900/30 text-blue-200'
                          : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      Shift‑Based Schedule
                    </button>
                  </div>
                </div>

                {/* Fixed-hours company */}
                {setupForm.work_type === 'fixed_hours' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
                    <div className="space-y-2">
                      <Label htmlFor="starttime" className="text-slate-200">
                        Start Time
                      </Label>
                      <Input
                        id="starttime"
                        type="time"
                        value={setupForm.workinghoursstart}
                        onChange={(e) =>
                          handleSetupInputChange(
                            'workinghoursstart',
                            e.target.value
                          )
                        }
                        className="bg-slate-900 border-slate-600 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endtime" className="text-slate-200">
                        End Time
                      </Label>
                      <Input
                        id="endtime"
                        type="time"
                        value={setupForm.workinghoursend}
                        onChange={(e) =>
                          handleSetupInputChange(
                            'workinghoursend',
                            e.target.value
                          )
                        }
                        className="bg-slate-900 border-slate-600 text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {/* Shift-based company */}
                {setupForm.work_type === 'shift_based' && (
                  <div className="space-y-4">
                    {/* Card 1: duration mode */}
                    <div
                      className={`p-4 rounded-lg border ${
                        shiftConfigMode === 'duration'
                          ? 'bg-purple-900/30 border-purple-500'
                          : 'bg-slate-900/40 border-slate-600 opacity-70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setShiftConfigMode('duration')}
                        className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-100"
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current">
                          {shiftConfigMode === 'duration' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-300" />
                          )}
                        </span>
                        Overall Shift Duration
                      </button>

                      <div className="space-y-2">
                        <Label htmlFor="shiftduration" className="text-slate-200">
                          Shift Duration (minutes)
                        </Label>
                        <Input
                          id="shiftduration"
                          type="number"
                          min={1}
                          value={setupForm.shift_duration_minutes ?? ''}
                          onChange={(e) =>
                            handleSetupInputChange(
                              'shift_duration_minutes',
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : null
                            )
                          }
                          placeholder="e.g. 480 for 8 hours"
                          className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                          disabled={shiftConfigMode !== 'duration'}
                        />
                        <p className="text-xs text-slate-400">
                          Total expected time per day including paid breaks.
                        </p>
                      </div>
                    </div>

                    {/* Card 2: detailed shifts */}
                    <div
                      className={`bg-slate-800 border rounded-lg p-5 space-y-4 ${
                        shiftConfigMode === 'shifts'
                          ? 'border-blue-500'
                          : 'border-slate-600 opacity-70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setShiftConfigMode('shifts')}
                        className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-100"
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current">
                          {shiftConfigMode === 'shifts' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                          )}
                        </span>
                        Detailed Work Schedule Shifts
                      </button>

                      <div className="space-y-3">
                        {shifts.map((shift, index) => (
                          <div
                            key={index}
                            className="p-4 bg-slate-900 rounded-lg border-2"
                            style={{
                              borderColor:
                                selectedShiftIndex === index ? '#3b82f6' : '#475569',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="radio"
                                name="defaultShift"
                                checked={selectedShiftIndex === index}
                                onChange={() => setSelectedShiftIndex(index)}
                                className="w-4 h-4"
                                disabled={shiftConfigMode !== 'shifts'}
                              />
                              <span className="text-sm font-medium text-slate-100">
                                Default for new employees
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <Label className="text-xs text-slate-300">
                                  Shift Name *
                                </Label>
                                <Input
                                  placeholder="e.g., Morning"
                                  value={shift.name}
                                  onChange={(e) =>
                                    handleShiftChange(
                                      index,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500"
                                  disabled={shiftConfigMode !== 'shifts'}
                                />
                              </div>
                              {shifts.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveShift(index)}
                                  className="self-end h-9 bg-red-700 hover:bg-red-800"
                                  disabled={shiftConfigMode !== 'shifts'}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <Label className="text-xs text-slate-300">
                                  Start Time *
                                </Label>
                                <Input
                                  type="time"
                                  value={shift.startTime || ''}
                                  onChange={(e) =>
                                    handleShiftChange(
                                      index,
                                      'startTime',
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 text-sm bg-slate-800 border-slate-700 text-slate-100"
                                  disabled={shiftConfigMode !== 'shifts'}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-300">
                                  End Time *
                                </Label>
                                <Input
                                  type="time"
                                  value={shift.endTime || ''}
                                  onChange={(e) =>
                                    handleShiftChange(
                                      index,
                                      'endTime',
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 text-sm bg-slate-800 border-slate-700 text-slate-100"
                                  disabled={shiftConfigMode !== 'shifts'}
                                />
                              </div>
                            </div>

                            <div className="mt-2">
                              <Label className="text-xs text-slate-300">
                                Description
                              </Label>
                              <Input
                                placeholder="Optional notes"
                                value={shift.description || ''}
                                onChange={(e) =>
                                  handleShiftChange(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                className="mt-1 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500"
                                disabled={shiftConfigMode !== 'shifts'}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {shifts.length < 3 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddShift}
                          className="w-full gap-2 border-slate-600 text-slate-100 hover:bg-slate-700 hover:text-slate-50"
                          disabled={shiftConfigMode !== 'shifts'}
                        >
                          <Plus className="h-4 w-4" /> Add Another Shift
                        </Button>
                      )}

                      <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-700/70 mt-2">
                        <p className="text-xs text-slate-300 mb-1">
                          Active configuration:{' '}
                          <span className="font-semibold text-blue-200">
                            {shiftConfigMode === 'duration'
                              ? 'Overall Shift Duration'
                              : 'Detailed Work Schedule'}
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-blue-200">
                          ✓ Default:{' '}
                          {shifts[selectedShiftIndex]?.name || 'Select shift'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Break time */}
                <div className="space-y-2">
                  <Label htmlFor="breakminutes" className="text-slate-200">
                    Break Time (minutes)
                  </Label>
                  <Input
                    id="breakminutes"
                    type="number"
                    min={0}
                    value={setupForm.break_minutes}
                    onChange={(e) =>
                      handleSetupInputChange(
                        'break_minutes',
                        parseInt(e.target.value || '0', 10)
                      )
                    }
                    className="bg-slate-700 border-slate-600 text-slate-100"
                  />
                  <p className="text-xs text-slate-400">
                    Default is 60 minutes. You can adjust this for your company policy.
                  </p>
                </div>

                {/* Leaves */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-100">
                    Leave Structure (Per Year)
                  </h4>
                  <div className="flex items-center gap-3">
                    <Label className="flex-1 text-slate-200">
                      Casual Leave Days
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={setupForm.casualleavedays}
                      onChange={(e) =>
                        handleSetupInputChange(
                          'casualleavedays',
                          parseInt(e.target.value || '0', 10)
                        )
                      }
                      className="w-20 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex-1 text-slate-200">
                      Sick Leave Days
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={setupForm.sickleavedays}
                      onChange={(e) =>
                        handleSetupInputChange(
                          'sickleavedays',
                          parseInt(e.target.value || '0', 10)
                        )
                      }
                      className="w-20 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex-1 text-slate-200">
                      Personal Leave Days
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={setupForm.personalleavedays}
                      onChange={(e) =>
                        handleSetupInputChange(
                          'personalleavedays',
                          parseInt(e.target.value || '0', 10)
                        )
                      }
                      className="w-20 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('info')}
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setActiveTab('managers')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Next: Add Managers
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: MANAGERS */}
              <TabsContent value="managers" className="space-y-6">
                <p className="text-sm text-slate-400">
                  Add HR and/or Manager (both are optional, you can add later)
                </p>

                <div className="bg-slate-800 border border-slate-600 rounded-lg p-5 space-y-4">
                  <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add HR Manager
                  </h4>

                  {addedHR ? (
                    <div className="p-3 bg-green-900/30 rounded border border-green-700/50">
                      <p className="font-medium text-green-200">
                        {addedHR.name}
                      </p>
                      <p className="text-sm text-green-300">
                        {addedHR.email}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleAddHR} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor="hrname"
                            className="text-sm text-slate-200"
                          >
                            HR Name
                          </Label>
                          <Input
                            id="hrname"
                            type="text"
                            name="name"
                            placeholder="e.g. Priya Sharma"
                            value={hrForm.name}
                            onChange={handleHRInputChange}
                            disabled={addingHR}
                            className="bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="hremail"
                            className="text-sm text-slate-200"
                          >
                            HR Email
                          </Label>
                          <Input
                            id="hremail"
                            type="email"
                            name="email"
                            placeholder="e.g. priya@company.com"
                            value={hrForm.email}
                            onChange={handleHRInputChange}
                            disabled={addingHR}
                            className="bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={addingHR || !hrForm.name || !hrForm.email}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        variant="default"
                      >
                        {addingHR ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding HR...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add HR
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>

                <div className="bg-slate-800 border border-slate-600 rounded-lg p-5 space-y-4">
                  <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Manager
                  </h4>

                  {addedManager ? (
                    <div className="p-3 bg-green-900/30 rounded border border-green-700/50">
                      <p className="font-medium text-green-200">
                        {addedManager.name}
                      </p>
                      <p className="text-sm text-green-300">
                        {addedManager.email}
                      </p>
                      <p className="text-xs text-green-400 mt-1">
                        Role: Manager
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleAddManager} className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="managername"
                          className="text-sm text-slate-200"
                        >
                          Manager Name
                        </Label>
                        <Input
                          id="managername"
                          type="text"
                          name="name"
                          placeholder="e.g. Rajesh Kumar"
                          value={managerForm.name}
                          onChange={handleManagerInputChange}
                          disabled={addingManager}
                          className="bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="manageremail"
                          className="text-sm text-slate-200"
                        >
                          Manager Email
                        </Label>
                        <Input
                          id="manageremail"
                          type="email"
                          name="email"
                          placeholder="e.g. rajesh@company.com"
                          value={managerForm.email}
                          onChange={handleManagerInputChange}
                          disabled={addingManager}
                          className="bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={
                          addingManager ||
                          !managerForm.name ||
                          !managerForm.email
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        variant="default"
                      >
                        {addingManager ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding Manager...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Manager
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('details')}
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setActiveTab('review')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Review Setup
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 4: Review */}
              <TabsContent value="review" className="space-y-6">
                <div className="bg-slate-700 dark:bg-slate-700 p-4 rounded-lg space-y-4 border border-slate-600">
                  
                  {/* Company Info */}
                  <div>
                    <p className="text-sm text-slate-400">Company Name</p>
                    <p className="font-semibold text-slate-100">
                      {setupForm.companyname || 'Not provided'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Industry</p>
                      <p className="font-semibold text-slate-100">{setupForm.companyindustry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Currency</p>
                      <p className="font-semibold text-slate-100">{setupForm.currency}</p>
                    </div>
                  </div>

                  {/* SCENARIO 1: Standard Office Hours */}
                  {setupForm.work_type === 'fixed_hours' && (
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-semibold text-blue-200">📋 Work Pattern: Standard Office Hours</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">Start Time</p>
                          <p className="font-semibold text-slate-100">{setupForm.workinghoursstart}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">End Time</p>
                          <p className="font-semibold text-slate-100">{setupForm.workinghoursend}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCENARIO 2: Flexible Shift Hours */}
                  {setupForm.work_type === 'shift_based' && !shifts.some(s => s.name) && (
                    <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-semibold text-purple-200">📋 Work Pattern: Shift-Based Flexible</p>
                      <div>
                        <p className="text-xs text-slate-400">Required Hours Per Day</p>
                        <p className="font-semibold text-slate-100">{setupForm.shift_duration_minutes} minutes</p>
                      </div>
                    </div>
                  )}

                  {/* SCENARIO 3: Detailed Schedule Shifts */}
                  {setupForm.work_type === 'shift_based' && shifts.some(s => s.name) && (
                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 space-y-3">
                      <p className="text-sm font-semibold text-green-200">📋 Work Pattern: Detailed Schedule</p>
                      <div className="space-y-2">
                        {shifts.map((shift, idx) => (
                          shift.name && (
                            <div key={idx} className="bg-slate-600 p-2 rounded text-xs">
                              <p className="font-semibold text-slate-100">
                                {shift.name}
                                {selectedShiftIndex === idx && ' (Default)'}
                              </p>
                              {shift.startTime && shift.endTime && (
                                <p className="text-slate-300">
                                  {shift.startTime} - {shift.endTime}
                                </p>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Break & Leave Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Break Time</p>
                      <p className="font-semibold text-slate-100">{setupForm.break_minutes} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Leave Days/Year</p>
                      <p className="font-semibold text-slate-100">
                        Casual: {setupForm.casualleavedays}, Sick: {setupForm.sickleavedays}, Personal: {setupForm.personalleavedays}
                      </p>
                    </div>
                  </div>

                  {/* Team Members */}
                  {(addedHR || addedManager) && (
                    <div>
                      <p className="text-sm text-slate-400">Team Members</p>
                      <ul className="font-semibold space-y-1">
                        {addedHR && (
                          <li className="text-blue-300">✓ {addedHR.name} - HR Manager</li>
                        )}
                        {addedManager && (
                          <li className="text-purple-300">✓ {addedManager.name} - Manager</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                  <p className="text-green-200 text-sm">
                    ✅ All information looks good. Click "Complete Setup" to finalize and proceed to admin dashboard.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('managers')}
                    className="flex-1 border-slate-500 text-slate-200 hover:bg-slate-700"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCompanySetup}
                    disabled={completingSetup}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {completingSetup ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default Onboarding
