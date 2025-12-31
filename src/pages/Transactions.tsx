import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTransactions } from '@/services/storage';
import { Transaction } from '@/types';
import { 
  ArrowLeft, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download
} from 'lucide-react';

const Transactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadTransactions = async () => {
      if (user) {
        const userTransactions = await getUserTransactions(); // No userId needed
        // Sort by date, newest first
        userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(userTransactions);
        setFilteredTransactions(userTransactions);
      }
    };

    loadTransactions();
  }, [user]);

  useEffect(() => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, typeFilter, statusFilter, transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      contribution: Wallet,
      payout: TrendingUp,
      security_deposit: Shield,
      penalty: AlertCircle,
      refund: TrendingDown,
    };
    return icons[type] || Wallet;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      contribution: 'bg-primary/10 text-primary',
      payout: 'bg-success/10 text-success',
      security_deposit: 'bg-warning/10 text-warning',
      penalty: 'bg-destructive/10 text-destructive',
      refund: 'bg-accent/10 text-accent',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contribution: 'Contribution',
      payout: 'Payout',
      security_deposit: 'Security Deposit',
      penalty: 'Penalty',
      refund: 'Refund',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; variant: any; label: string }> = {
      completed: { icon: CheckCircle2, variant: 'default', label: 'Completed' },
      pending: { icon: Clock, variant: 'secondary', label: 'Pending' },
      failed: { icon: AlertCircle, variant: 'destructive', label: 'Failed' },
    };
    const { icon: Icon, variant, label } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Calculate stats
  const totalIn = transactions
    .filter((t) => t.type === 'payout' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = transactions
    .filter(
      (t) =>
        (t.type === 'contribution' || t.type === 'security_deposit' || t.type === 'penalty') &&
        t.status === 'completed'
    )
    .reduce((sum, t) => sum + t.amount, 0);

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

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Transaction History
            </h1>
            <p className="text-muted-foreground">
              View all your contributions, payouts, and other transactions
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalIn)}</p>
                <p className="text-xs text-muted-foreground">All payouts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOut)}</p>
                <p className="text-xs text-muted-foreground">All contributions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${totalIn - totalOut >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totalIn - totalOut)}
                </p>
                <p className="text-xs text-muted-foreground">Current balance</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contribution">Contributions</SelectItem>
                    <SelectItem value="payout">Payouts</SelectItem>
                    <SelectItem value="security_deposit">Security Deposits</SelectItem>
                    <SelectItem value="penalty">Penalties</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Your transactions will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>
                      Showing {filteredTransactions.length} of {transactions.length} transactions
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 w-4 h-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredTransactions.map((transaction) => {
                    const Icon = getTypeIcon(transaction.type);
                    const isIncoming = transaction.type === 'payout' || transaction.type === 'refund';

                    return (
                      <div
                        key={transaction.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getTypeColor(transaction.type)}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{transaction.description}</p>
                                {getStatusBadge(transaction.status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  {new Date(transaction.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="text-xs">•</span>
                                <span>{getTypeLabel(transaction.type)}</span>
                                <span className="text-xs">•</span>
                                <span className="text-xs font-mono">{transaction.reference}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${
                                isIncoming ? 'text-success' : 'text-foreground'
                              }`}
                            >
                              {isIncoming ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Transactions;
