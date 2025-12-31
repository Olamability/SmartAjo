import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getMyGroups } from '@/services/groupService';
import { getUserTransactions } from '@/services/storage';
import { Group, Transaction } from '@/types';
import { Plus, Users, Wallet, TrendingUp, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalSaved: 0,
    totalReceived: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (user) {
        const [userGroups, userTransactions] = await Promise.all([
          getMyGroups(),
          getUserTransactions(), // No userId needed - backend uses authenticated user
        ]);
        
        setGroups(userGroups);
        setTransactions(userTransactions.slice(0, 5)); // Show only recent 5

        // Calculate stats
        const totalContributions = userTransactions
          .filter(t => t.type === 'contribution' && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalPayouts = userTransactions
          .filter(t => t.type === 'payout' && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);

        setStats({
          totalGroups: userGroups.length,
          activeGroups: userGroups.filter(g => g.status === 'active').length,
          totalSaved: totalContributions,
          totalReceived: totalPayouts,
        });
      }
    };

    loadDashboardData();
  }, [user]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {user?.fullName}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your savings groups and activity
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGroups}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeGroups} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalSaved)}</div>
                <p className="text-xs text-muted-foreground">
                  All contributions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</div>
                <p className="text-xs text-muted-foreground">
                  All payouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalSaved - stats.totalReceived)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current balance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => navigate('/create-group')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Group
                </CardTitle>
                <CardDescription>
                  Start your own savings group with custom rules
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => navigate('/browse-groups')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Browse Groups
                </CardTitle>
                <CardDescription>
                  Join existing groups looking for members
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* My Groups */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">My Groups</h2>
              {groups.length > 0 && (
                <Button variant="ghost" onClick={() => navigate('/browse-groups')}>
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>

            {groups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    Get started by creating a new group or joining an existing one
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => navigate('/create-group')}>
                      <Plus className="mr-2 w-4 h-4" />
                      Create Group
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/browse-groups')}>
                      Browse Groups
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/group/${group.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {getStatusBadge(group.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {group.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Contribution</span>
                          <span className="font-medium">{formatCurrency(group.contributionAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Frequency</span>
                          <span className="font-medium capitalize">{group.frequency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Members</span>
                          <span className="font-medium">{group.currentMembers}/{group.totalMembers}</span>
                        </div>
                        {group.status === 'active' && (
                          <>
                            <div className="pt-2">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Cycle Progress</span>
                                <span className="font-medium">{group.currentCycle}/{group.totalCycles}</span>
                              </div>
                              <Progress 
                                value={(group.currentCycle / group.totalCycles) * 100} 
                                className="h-2"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
                <Button variant="ghost" onClick={() => navigate('/transactions')}>
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'payout' ? 'bg-success/10' : 'bg-primary/10'
                          }`}>
                            {transaction.type === 'payout' ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : (
                              <Wallet className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.type === 'payout' ? 'text-success' : 'text-foreground'
                          }`}>
                            {transaction.type === 'payout' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {transaction.status === 'completed' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
