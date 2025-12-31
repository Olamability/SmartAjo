import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAvailableGroupsToJoin, joinGroup } from '@/services/groupService';
import { Group } from '@/types';
import { Search, Users, Calendar, Wallet, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BrowseGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(groups);
    }
  }, [searchTerm, groups]);

  const loadGroups = async () => {
    const availableGroups = await getAvailableGroupsToJoin();
    setGroups(availableGroups);
    setFilteredGroups(availableGroups);
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      const result = await joinGroup(groupId);
      
      if (result.success) {
        toast.success('Successfully joined group!');
        navigate(`/group/${groupId}`);
      } else {
        toast.error(result.error || 'Failed to join group');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setJoiningGroupId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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
              Browse Groups
            </h1>
            <p className="text-muted-foreground">
              Find and join savings groups that match your goals
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No groups found' : 'No available groups'}
                </h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'There are no groups currently accepting new members. Check back later or create your own group.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => navigate('/create-group')}>
                    Create New Group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <Badge variant="secondary">
                        {group.currentMembers}/{group.totalMembers} Members
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {group.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Wallet className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Contribution</p>
                            <p className="font-semibold">
                              {formatCurrency(group.contributionAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Frequency</p>
                            <p className="font-semibold capitalize">{group.frequency}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Spots Available</p>
                            <p className="font-semibold">
                              {group.totalMembers - group.currentMembers} remaining
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Security Deposit</span>
                          <span className="font-medium">
                            {formatCurrency(group.securityDepositAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Payout</span>
                          <span className="font-medium">
                            {formatCurrency(group.contributionAmount * group.totalMembers)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/group/${group.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joiningGroupId === group.id}
                        >
                          {joiningGroupId === group.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            'Join Group'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BrowseGroups;
