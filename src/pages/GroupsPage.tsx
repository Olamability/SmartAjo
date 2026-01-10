import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGroups } from '@/api';
import type { Group as ApiGroup } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Plus, Users, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGroups = async () => {
    // Skip loading groups in bypass mode
    if (bypassAuth && !user) {
      setLoading(false);
      return;
    }
    
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getUserGroups();
      if (result.success && result.groups) {
        setGroups(result.groups);
      } else {
        toast.error(result.error || 'Failed to load groups');
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (bypassAuth) {
      navigate('/login', { replace: true });
    } else {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && !bypassAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Auth Bypass Warning Banner */}
        {bypassAuth && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">⚠️  Authentication Bypass Active</p>
                  <p className="text-sm text-yellow-700">
                    You are viewing the groups page in bypass mode. Some features may not work without real authentication.
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
              <h1 className="text-2xl font-bold">My Groups</h1>
              <p className="text-muted-foreground">
                Welcome back, {displayUser?.fullName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Create Group Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Your Ajo Groups</h2>
            <p className="text-sm text-muted-foreground">
              Manage your savings groups and track contributions
            </p>
          </div>
          <Button onClick={() => navigate('/groups/create')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Group
          </Button>
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {bypassAuth 
                  ? 'In bypass mode, you need real authentication to load groups data.'
                  : 'Create or join a group to start saving together'}
              </p>
              <Button onClick={() => navigate('/groups/create')} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{group.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {group.description}
                      </CardDescription>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(
                        group.status
                      )}`}
                    >
                      {group.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        Contribution
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(group.contributionAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        Security Deposit
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(group.securityDepositAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        Members
                      </span>
                      <span className="font-semibold">
                        {group.currentMembers} / {group.totalMembers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Frequency
                      </span>
                      <span className="font-semibold capitalize">
                        {group.frequency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
