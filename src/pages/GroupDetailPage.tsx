import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupById, getGroupMembers, updateSecurityDepositPayment } from '@/api';
import type { Group, GroupMember } from '@/types';
import { paystackService, PaystackResponse } from '@/lib/paystack';
import ContributionsList from '@/components/ContributionsList';
import PayoutSchedule from '@/components/PayoutSchedule';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Shield,
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  Loader2,
  UserPlus,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentUserMember, setCurrentUserMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (id) {
      loadGroupDetails();
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadGroupDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const result = await getGroupById(id);
      if (result.success && result.group) {
        setGroup(result.group);
        setIsCreator(result.group.createdBy === user?.id);
      } else {
        toast.error(result.error || 'Failed to load group details');
        navigate('/groups');
      }
    } catch (error) {
      console.error('Error loading group:', error);
      toast.error('Failed to load group details');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;

    try {
      const result = await getGroupMembers(id);
      if (result.success && result.members) {
        setMembers(result.members);
        // Find current user's membership
        const userMembership = result.members.find(m => m.userId === user?.id);
        setCurrentUserMember(userMembership || null);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handlePaySecurityDeposit = async () => {
    if (!group || !user || !id) return;

    setIsProcessingPayment(true);
    try {
      await paystackService.paySecurityDeposit(
        user.email,
        group.securityDepositAmount,
        id,
        user.id,
        async (response: PaystackResponse) => {
          // Payment successful
          if (response.status === 'success') {
            // Update database
            const result = await updateSecurityDepositPayment(
              id,
              user.id,
              response.reference
            );
            
            if (result.success) {
              toast.success('Security deposit paid successfully!');
              // Reload group and members data
              loadGroupDetails();
              loadMembers();
            } else {
              toast.error('Payment successful but failed to update record. Please contact support.');
            }
          } else {
            toast.error('Payment was not successful');
          }
          setIsProcessingPayment(false);
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initialize payment');
      setIsProcessingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'forming':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMembershipProgress = () => {
    if (!group) return 0;
    return (group.currentMembers / group.totalMembers) * 100;
  };

  const calculateTotalPool = () => {
    if (!group) return 0;
    return group.contributionAmount * group.totalMembers;
  };

  const calculateServiceFee = () => {
    const totalPool = calculateTotalPool();
    return totalPool * 0.1; // 10% service fee
  };

  const calculateNetPayout = () => {
    const totalPool = calculateTotalPool();
    const serviceFee = calculateServiceFee();
    return totalPool - serviceFee;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
          <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{group.name}</h1>
                <Badge className={getStatusColor(group.status)}>
                  {group.status}
                </Badge>
                {isCreator && (
                  <Badge variant="outline">Creator</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{group.description}</p>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {group.status === 'forming' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This group is still forming. Invite members to join and pay security deposits to activate the group.
              {isCreator && ' Once all members have joined and paid their security deposits, you can activate the group.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">
                    {group.currentMembers}/{group.totalMembers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <Progress value={getMembershipProgress()} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contribution</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(group.contributionAmount)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 capitalize">
                {group.frequency}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Cycle</p>
                  <p className="text-2xl font-bold">
                    {group.currentCycle}/{group.totalCycles}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <Progress
                value={(group.currentCycle / group.totalCycles) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-bold">
                    {formatDate(group.startDate)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Group Financial Summary</CardTitle>
                <CardDescription>
                  Overview of financial details per cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Total Pool per Cycle</span>
                  <span className="text-xl font-semibold">
                    {formatCurrency(calculateTotalPool())}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Service Fee (10%)</span>
                  <span className="text-xl font-semibold text-orange-600">
                    -{formatCurrency(calculateServiceFee())}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold">Net Payout per Member</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculateNetPayout())}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Deposit</CardTitle>
                <CardDescription>
                  Required upfront payment for participation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {group.securityDepositPercentage}% of contribution
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Refunded at the end if all contributions are made on time
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {formatCurrency(group.securityDepositAmount)}
                  </span>
                </div>
                
                {/* Security Deposit Payment Status */}
                {currentUserMember && (
                  <div className="pt-4 border-t">
                    {currentUserMember.securityDepositPaid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">You have paid your security deposit</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            You need to pay your security deposit to participate in this group.
                          </AlertDescription>
                        </Alert>
                        <Button
                          onClick={handlePaySecurityDeposit}
                          disabled={isProcessingPayment}
                          className="w-full"
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Pay Security Deposit ({formatCurrency(group.securityDepositAmount)})
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {group.status === 'forming' && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                  <CardDescription>
                    What needs to happen before the group starts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      group.currentMembers === group.totalMembers ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {group.currentMembers === group.totalMembers ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Fill all member positions</p>
                      <p className="text-sm text-muted-foreground">
                        {group.currentMembers}/{group.totalMembers} members joined
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">All members pay security deposit</p>
                      <p className="text-sm text-muted-foreground">
                        Required before group activation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Activate the group</p>
                      <p className="text-sm text-muted-foreground">
                        Start date: {formatDate(group.startDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Group Members</CardTitle>
                    <CardDescription>
                      {group.currentMembers} of {group.totalMembers} positions filled
                    </CardDescription>
                  </div>
                  {isCreator && group.status === 'forming' && (
                    <Button size="sm" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Invite Members
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {member.rotationPosition}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{member.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            Position {member.rotationPosition}
                            {member.userId === group.createdBy && ' • Creator'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={member.status === 'active' ? 'default' : 'outline'}>
                            {member.status}
                          </Badge>
                          {member.securityDepositPaid ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              <span>Deposit Paid</span>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600">Deposit Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty slots */}
                    {Array.from({ length: group.totalMembers - members.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex items-center gap-3 p-3 border border-dashed rounded-lg opacity-50">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="font-semibold text-gray-400">
                            {members.length + i + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-muted-foreground">Empty Slot</p>
                          <p className="text-sm text-muted-foreground">
                            Position {members.length + i + 1}
                          </p>
                        </div>
                        <Badge variant="outline">Available</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contributions Tab */}
          <TabsContent value="contributions" className="space-y-4">
            {group.status === 'forming' ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Contributions will start once the group is activated
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ContributionsList
                groupId={group.id}
                groupName={group.name}
                contributionAmount={group.contributionAmount}
              />
            )}
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4">
            {group.status === 'forming' ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Payout schedule will be available once the group is activated
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PayoutSchedule
                groupId={group.id}
                currentCycle={group.currentCycle}
                totalCycles={group.totalCycles}
                netPayoutAmount={calculateNetPayout()}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
