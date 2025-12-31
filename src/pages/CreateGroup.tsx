import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createGroup } from '@/services/groupService';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  contributionAmount: z.number().min(1000, 'Minimum contribution is ₦1,000'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  totalMembers: z.number().min(2, 'Minimum 2 members').max(20, 'Maximum 20 members'),
  securityDepositPercentage: z.number().min(10, 'Minimum 10%').max(50, 'Maximum 50%'),
  startDate: z.string().min(1, 'Start date is required'),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

const CreateGroup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      frequency: 'monthly',
      securityDepositPercentage: 20,
      totalMembers: 5,
    },
  });

  const contributionAmount = watch('contributionAmount') || 0;
  const securityDepositPercentage = watch('securityDepositPercentage') || 20;
  const totalMembers = watch('totalMembers') || 5;
  const frequency = watch('frequency') || 'monthly';

  const securityDepositAmount = Math.round((contributionAmount * securityDepositPercentage) / 100);
  const totalPayout = contributionAmount * totalMembers;

  const onSubmit = async (data: CreateGroupFormData) => {
    setIsLoading(true);
    try {
      const result = await createGroup(data);
      
      if (result.success && result.group) {
        toast.success('Group created successfully!');
        navigate(`/group/${result.group.id}`);
      } else {
        toast.error(result.error || 'Failed to create group');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
              Create New Group
            </h1>
            <p className="text-muted-foreground">
              Set up your savings group with custom rules and requirements
            </p>
          </div>

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              As the creator, you'll be the first member. Share the group link with others to invite them to join.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Give your group a name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Lagos Traders Circle"
                    {...register('name')}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell members what this group is about..."
                    rows={4}
                    {...register('description')}
                    disabled={isLoading}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contribution Settings</CardTitle>
                <CardDescription>
                  Define how much and how often members contribute
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contributionAmount">Contribution Amount (₦) *</Label>
                    <Input
                      id="contributionAmount"
                      type="number"
                      placeholder="50000"
                      {...register('contributionAmount', { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {errors.contributionAmount && (
                      <p className="text-sm text-destructive">{errors.contributionAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Payment Frequency *</Label>
                    <Select
                      value={frequency}
                      onValueChange={(value) => setValue('frequency', value as any)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-sm text-destructive">{errors.frequency.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalMembers">Total Members *</Label>
                    <Input
                      id="totalMembers"
                      type="number"
                      placeholder="5"
                      {...register('totalMembers', { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {errors.totalMembers && (
                      <p className="text-sm text-destructive">{errors.totalMembers.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Number of members determines the total cycles
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...register('startDate')}
                      disabled={isLoading}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive">{errors.startDate.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Protect your group with security deposits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="securityDepositPercentage">
                    Security Deposit (% of contribution) *
                  </Label>
                  <Input
                    id="securityDepositPercentage"
                    type="number"
                    min="10"
                    max="50"
                    {...register('securityDepositPercentage', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  {errors.securityDepositPercentage && (
                    <p className="text-sm text-destructive">
                      {errors.securityDepositPercentage.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Members must pay {securityDepositPercentage}% (₦{securityDepositAmount.toLocaleString()}) 
                    as security deposit before group starts
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Security deposits protect the group against defaults. If a member fails to contribute,
                    their deposit covers the shortfall.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contribution per cycle:</span>
                  <span className="font-semibold">₦{contributionAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security deposit per member:</span>
                  <span className="font-semibold">₦{securityDepositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total payout per cycle:</span>
                  <span className="font-semibold">₦{totalPayout.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee (10%):</span>
                  <span className="font-semibold">₦{Math.round(contributionAmount * 0.1).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Total cycles:</span>
                  <span className="font-semibold">{totalMembers}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateGroup;
