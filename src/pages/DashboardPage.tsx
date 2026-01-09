import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect unauthenticated users - but only after loading is complete
  useEffect(() => {
    // Add a small buffer to prevent race conditions during navigation after signup
    const redirectTimer = setTimeout(() => {
      if (!loading && !isAuthenticated) {
        console.log('DashboardPage: Redirecting unauthenticated user to login');
        navigate('/login', { replace: true });
      }
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [isAuthenticated, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.fullName}
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {user.phone}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              {user.isVerified ? (
                <span className="text-green-600">Verified</span>
              ) : (
                <span className="text-yellow-600">Not Verified</span>
              )}
            </div>
            <div>
              <span className="font-medium">KYC Status:</span>{' '}
              {user.kycStatus || 'Not started'}
            </div>
          </CardContent>
        </Card>

        {/* Auth Info */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Supabase Auth integration is working!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You are successfully authenticated using Supabase Auth. Your
              session is managed automatically and refreshed when needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
