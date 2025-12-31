import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getGroupById, paySecurityDeposit, makeContribution, getGroupContributions } from '@/services/groupService';
import { getUserContributions } from '@/services/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Group, Contribution } from '@/types';
import { 
  ArrowLeft, 
  Users, 
  Wallet, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [userContributions, setUserContributions] = useState<Contribution[]>([]);
  const [isPayingDeposit, setIsPayingDeposit] = useState(false);
  const [payingContributionId, setPayingContributionId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadGroupData();
    }
  }, [id, user]);

  const loadGroupData = async () => {
    if (!id) return;
    
    const groupData = await getGroupById(id);
    if (groupData) {
      setGroup(groupData);
      
      const [allContributions, myContributions] = await Promise.all([
        getGroupContributions(id),
        user ? getUserContributions(user.id, id) : Promise.resolve([])
      ]);
      
      setContributions(allContributions);
      setUserContributions(myContributions);
    }
  };

  const handlePaySecurityDeposit = async () => {
    if (!id) return;
    
    setIsPayingDeposit(true);
    try {
      const result = await paySecurityDeposit(id);
      
      if (result.success) {
        toast.success('Security deposit paid successfully!');
        loadGroupData();
      } else {
        toast.error(result.error || 'Failed to pay security deposit');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsPayingDeposit(false);
    }
  };

  const handleMakeContribution = async (contributionId: string) => {
    setPayingContributionId(contributionId);
    try {
      const result = await makeContribution(contributionId);
      
      if (result.success) {
        toast.success('Contribution paid successfully!');
        loadGroupData();
      } else {
        toast.error(result.error || 'Failed to make contribution');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setPayingContributionId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      forming: { variant: 'secondary', label: 'Forming' },
      active: { variant: 'default', label: 'Active' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getContributionStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      paid: { icon: CheckCircle2, color: 'text-success', label: 'Paid' },
      pending: { icon: Clock, color: 'text-warning', label: 'Pending' },
      late: { icon: AlertCircle, color: 'text-destructive', label: 'Late' },
      missed: { icon: AlertCircle, color: 'text-destructive', label: 'Missed' },
    };
    const { icon: Icon, color, label } = config[status] || config.pending;
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Group not found</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentMember = group.members.find(m => m.userId === user?.id);
  const pendingContributions = userContributions.filter(c => c.status === 'pending');
  const cycleContributions = contributions.filter(c => c.cycle === group.currentCycle);
  const paidCount = cycleContributions.filter(c => c.status === 'paid' || c.status === 'late').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {group.name}
                </h1>
                <p className="text-muted-foreground">
                  {group.description}
                </p>
              </div>
              {getStatusBadge(group.status)}
            </div>
          </div>

          {/* Security Deposit Alert */}
          {currentMember && !currentMember.securityDepositPaid && group.status === 'forming' && (
            <Alert className="mb-6 border-warning">
              <Shield className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  You need to pay a security deposit of {formatCurrency(group.securityDepositAmount)} to activate your membership.
                </span>
                <Button 
                  size="sm" 
                  onClick={handlePaySecurityDeposit}
                  disabled={isPayingDeposit}
                >
                  {isPayingDeposit ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-3 w-3" />
                      Pay Deposit
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Pending Contributions Alert */}
          {pendingContributions.length > 0 && group.status === 'active' && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have {pendingContributions.length} pending contribution(s) for this cycle.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(group.contributionAmount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{group.frequency}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Payout
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(group.contributionAmount * group.totalMembers)}
                    </p>
                    <p className="text-xs text-muted-foreground">Per cycle</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Your Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      #{currentMember?.rotationPosition || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">of {group.totalMembers}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cycle Progress */}
              {group.status === 'active' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Cycle Progress</CardTitle>
                    <CardDescription>
                      Cycle {group.currentCycle} of {group.totalCycles}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Members Paid</span>
                        <span className="font-medium">{paidCount}/{group.totalMembers}</span>
                      </div>
                      <Progress value={(paidCount / group.totalMembers) * 100} className="h-3" />
                    </div>
                    
                    {paidCount === group.totalMembers && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          All members have contributed! Payout will be processed automatically.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <Tabs defaultValue="contributions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="contributions">My Contributions</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <TabsContent value="contributions" className="space-y-4">
                  {userContributions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No contributions yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    userContributions.map((contribution) => (
                      <Card key={contribution.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold mb-1">
                                Cycle {contribution.cycle}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(contribution.dueDate).toLocaleDateString()}
                              </p>
                              {contribution.paidDate && (
                                <p className="text-sm text-muted-foreground">
                                  Paid: {new Date(contribution.paidDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg mb-2">
                                {formatCurrency(contribution.amount + contribution.serviceFee + contribution.penalty)}
                              </p>
                              {getContributionStatusBadge(contribution.status)}
                            </div>
                          </div>
                          {contribution.status === 'pending' && (
                            <Button 
                              className="w-full mt-4"
                              onClick={() => handleMakeContribution(contribution.id)}
                              disabled={payingContributionId === contribution.id}
                            >
                              {payingContributionId === contribution.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Pay Now'
                              )}
                            </Button>
                          )}
                          {contribution.penalty > 0 && (
                            <Alert className="mt-4" variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Late payment penalty: {formatCurrency(contribution.penalty)}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  {group.members.map((member) => {
                    const memberContributions = contributions.filter(c => c.userId === member.userId);
                    const paidContributions = memberContributions.filter(c => c.status === 'paid' || c.status === 'late').length;
                    
                    return (
                      <Card key={member.userId}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{member.userName}</p>
                              <p className="text-sm text-muted-foreground">
                                Position #{member.rotationPosition}
                              </p>
                              <div className="flex gap-2 mt-2">
                                {member.securityDepositPaid && (
                                  <Badge variant="outline" className="gap-1">
                                    <Shield className="w-3 h-3" />
                                    Deposit Paid
                                  </Badge>
                                )}
                                {member.hasReceivedPayout && (
                                  <Badge variant="outline" className="gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Received Payout
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground mb-1">Contributions</p>
                              <p className="font-semibold">
                                {paidContributions}/{memberContributions.length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Group Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Members</p>
                      <p className="font-semibold">{group.currentMembers}/{group.totalMembers}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-semibold">
                        {group.startDate ? new Date(group.startDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Security Deposit</p>
                      <p className="font-semibold">{formatCurrency(group.securityDepositAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Service Fee</p>
                      <p className="font-semibold">{group.serviceFeePercentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {currentMember && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Contributions</span>
                      <span className="font-semibold">{currentMember.totalContributions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Penalties</span>
                      <span className="font-semibold">{formatCurrency(currentMember.totalPenalties)}</span>
                    </div>
                    {currentMember.payoutAmount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payout Received</span>
                        <span className="font-semibold text-success">
                          {formatCurrency(currentMember.payoutAmount)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GroupDetail;
