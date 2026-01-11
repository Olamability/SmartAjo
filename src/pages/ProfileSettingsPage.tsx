import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getUserProfile, updateUserProfile, NIGERIAN_BANKS } from '@/api';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  User as UserIcon,
  Building2,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Invalid Nigerian phone number'),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

// Bank account form schema
const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Please select a bank'),
  bankCode: z.string().min(1, 'Bank code is required'),
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  accountName: z.string().min(2, 'Account name is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type BankAccountFormData = z.infer<typeof bankAccountSchema>;

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      dateOfBirth: '',
    },
  });

  // Bank account form
  const bankForm = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankName: '',
      bankCode: '',
      accountNumber: '',
      accountName: '',
    },
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserProfile();
      if (result.success && result.user) {
        setProfileData(result.user);
        
        // Update profile form
        profileForm.reset({
          fullName: result.user.fullName || '',
          phone: result.user.phone || '',
          address: result.user.address || '',
          dateOfBirth: result.user.dateOfBirth || '',
        });

        // Update bank form if bank details exist
        if (result.user.bankName) {
          bankForm.reset({
            bankName: result.user.bankName || '',
            bankCode: result.user.bankCode || '',
            accountNumber: result.user.accountNumber || '',
            accountName: result.user.accountName || '',
          });
        }
      } else {
        toast.error(result.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileForm, bankForm]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const result = await updateUserProfile({
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        dateOfBirth: data.dateOfBirth,
      });

      if (result.success) {
        toast.success('Profile updated successfully');
        await loadProfile();
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const onBankAccountSubmit = async (data: BankAccountFormData) => {
    setSaving(true);
    try {
      const result = await updateUserProfile({
        bankAccount: {
          bankName: data.bankName,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        },
      });

      if (result.success) {
        toast.success('Bank account details updated successfully');
        await loadProfile();
      } else {
        toast.error(result.error || 'Failed to update bank account');
      }
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast.error('Failed to update bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleBankSelection = (bankName: string) => {
    const bank = NIGERIAN_BANKS.find(b => b.name === bankName);
    if (bank) {
      bankForm.setValue('bankName', bank.name);
      bankForm.setValue('bankCode', bank.code);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile and bank account details
            </p>
          </div>
        </div>

        {/* Alert about bank account importance */}
        {!profileData?.accountNumber && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Important:</strong> You need to add your bank account details to receive payouts from groups.
            </AlertDescription>
          </Alert>
        )}

        {profileData?.accountNumber && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Your bank account is configured. You can receive payouts from groups.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      {...profileForm.register('fullName')}
                      placeholder="John Doe"
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...profileForm.register('phone')}
                      placeholder="+2348012345678"
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={profileData?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address (Optional)</Label>
                    <Input
                      id="address"
                      {...profileForm.register('address')}
                      placeholder="123 Main Street, Lagos"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...profileForm.register('dateOfBirth')}
                    />
                  </div>

                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Account Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                  Add your bank account to receive payouts from groups. This information is required to participate in groups and receive your rotational payouts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={bankForm.handleSubmit(onBankAccountSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Select
                      value={bankForm.watch('bankName')}
                      onValueChange={handleBankSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={bank.name}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bankForm.formState.errors.bankName && (
                      <p className="text-sm text-destructive">
                        {bankForm.formState.errors.bankName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      {...bankForm.register('accountNumber')}
                      placeholder="0123456789"
                      maxLength={10}
                    />
                    {bankForm.formState.errors.accountNumber && (
                      <p className="text-sm text-destructive">
                        {bankForm.formState.errors.accountNumber.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter your 10-digit account number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      {...bankForm.register('accountName')}
                      placeholder="JOHN DOE"
                    />
                    {bankForm.formState.errors.accountName && (
                      <p className="text-sm text-destructive">
                        {bankForm.formState.errors.accountName.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the name on your bank account (should match your bank records)
                    </p>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      <strong>Note:</strong> Make sure your account details are correct. 
                      Incorrect details may result in failed payouts.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Bank Account
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
