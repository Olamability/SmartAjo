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
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  
  // ⚠️  TEMPORARY: Check for auth bypass flag (development only)
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';
  
  // Mock user data for bypass mode
  const mockUser = bypassAuth && !user ? {
    id: 'mock-user-id',
    email: 'demo@example.com',
    phone: '+234-XXX-XXX-XXXX',
    fullName: 'Demo User (Bypass Mode)',
    createdAt: new Date().toISOString(),
    isVerified: false,
    kycStatus: 'Not started',
    bvn: undefined,
    profileImage: undefined,
  } : null;
  
  const displayUser = user || mockUser;

  const handleLogout = async () => {
    if (bypassAuth) {
      navigate('/login', { replace: true });
    } else {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  if (loading && !bypassAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Auth Bypass Warning Banner */}
        {bypassAuth && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">⚠️  Authentication Bypass Active</p>
                  <p className="text-sm text-yellow-700">
                    You are viewing the dashboard in bypass mode. This is for testing only and should never be used in production.
                    Set VITE_BYPASS_AUTH=false in your .env file to restore normal authentication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {displayUser.fullName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/groups')}>
              My Groups
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Email:</span> {displayUser.email}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {displayUser.phone}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              {displayUser.isVerified ? (
                <span className="text-green-600">Verified</span>
              ) : (
                <span className="text-yellow-600">Not Verified</span>
              )}
            </div>
            <div>
              <span className="font-medium">KYC Status:</span>{' '}
              {displayUser.kycStatus || 'Not started'}
            </div>
          </CardContent>
        </Card>

        {/* Auth Info */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              {bypassAuth 
                ? 'Running in bypass mode for testing'
                : 'Supabase Auth integration is working!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {bypassAuth 
                ? 'You are viewing the dashboard without authentication. This allows you to test the UI and functionality without needing to fix login issues first. Remember to set VITE_BYPASS_AUTH=false when authentication is working properly.'
                : 'You are successfully authenticated using Supabase Auth. Your session is managed automatically and refreshed when needed.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
