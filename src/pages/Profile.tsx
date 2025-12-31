import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/auth';
import { toast } from 'sonner';
import { ArrowLeft, User, Mail, Phone, Shield, Loader2, CheckCircle2 } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
});

const kycSchema = z.object({
  bvn: z.string().length(11, 'BVN must be 11 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type KYCFormData = z.infer<typeof kycSchema>;

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerKYC,
    handleSubmit: handleSubmitKYC,
    formState: { errors: kycErrors },
  } = useForm<KYCFormData>({
    resolver: zodResolver(kycSchema),
  });

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsUpdating(true);
    try {
      const result = await updateUserProfile(data);
      
      if (result.success) {
        refreshUser();
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const onSubmitKYC = async (data: KYCFormData) => {
    setIsSubmittingKYC(true);
    try {
      const result = await updateUserProfile({
        bvn: data.bvn,
        kycStatus: 'pending',
      });
      
      if (result.success) {
        refreshUser();
        toast.success('KYC verification submitted! We will review your information.');
      } else {
        toast.error(result.error || 'Failed to submit KYC');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsSubmittingKYC(false);
    }
  };

  const getKYCStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      not_started: { variant: 'secondary', label: 'Not Started' },
      pending: { variant: 'default', label: 'Pending Review' },
      verified: { variant: 'default', label: 'Verified' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const { variant, label } = config[status] || config.not_started;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and verification status
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your profile details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          {...registerProfile('fullName')}
                          disabled={isUpdating}
                        />
                        {profileErrors.fullName && (
                          <p className="text-sm text-destructive">
                            {profileErrors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user.email}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...registerProfile('phone')}
                          disabled={isUpdating}
                        />
                        {profileErrors.phone && (
                          <p className="text-sm text-destructive">
                            {profileErrors.phone.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Account Status</Label>
                        <div className="flex items-center gap-2">
                          {user.isVerified ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-success" />
                              <span className="text-sm">Verified</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-5 h-5 text-warning" />
                              <span className="text-sm">Not Verified</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kyc">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>KYC Verification</CardTitle>
                      <CardDescription>
                        Verify your identity to increase your limits
                      </CardDescription>
                    </div>
                    {getKYCStatusBadge(user.kycStatus)}
                  </div>
                </CardHeader>
                <CardContent>
                  {user.kycStatus === 'verified' ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">KYC Verified</h3>
                      <p className="text-muted-foreground">
                        Your identity has been verified successfully
                      </p>
                    </div>
                  ) : user.kycStatus === 'pending' ? (
                    <div className="text-center py-8">
                      <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Verification Pending</h3>
                      <p className="text-muted-foreground">
                        Your KYC submission is under review. This usually takes 1-2 business days.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitKYC(onSubmitKYC)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="bvn">Bank Verification Number (BVN)</Label>
                          <Input
                            id="bvn"
                            placeholder="12345678901"
                            maxLength={11}
                            {...registerKYC('bvn')}
                            disabled={isSubmittingKYC}
                          />
                          {kycErrors.bvn && (
                            <p className="text-sm text-destructive">
                              {kycErrors.bvn.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Your BVN is required for identity verification
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            {...registerKYC('dateOfBirth')}
                            disabled={isSubmittingKYC}
                          />
                          {kycErrors.dateOfBirth && (
                            <p className="text-sm text-destructive">
                              {kycErrors.dateOfBirth.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Residential Address</Label>
                          <Input
                            id="address"
                            placeholder="123 Main Street, Lagos"
                            {...registerKYC('address')}
                            disabled={isSubmittingKYC}
                          />
                          {kycErrors.address && (
                            <p className="text-sm text-destructive">
                              {kycErrors.address.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmittingKYC}>
                        {isSubmittingKYC ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit for Verification'
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email Verification</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {user.isVerified ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm">
                          Verify
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Phone Verification</p>
                          <p className="text-sm text-muted-foreground">
                            {user.phone}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Verify
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-muted-foreground">
                            Last changed: Never
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
