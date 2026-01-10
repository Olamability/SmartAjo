/**
 * Statistics API Service
 * 
 * Handles fetching user statistics and analytics
 */

import { createClient } from '@/lib/client/supabase';
import { getErrorMessage } from '@/lib/utils';

export interface UserStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalContributions: number;
  totalPayouts: number;
  pendingContributions: number;
  overdueContributions: number;
  upcomingPayouts: number;
}

/**
 * Get user statistics dashboard data
 */
export const getUserStats = async (): Promise<{
  success: boolean;
  stats?: UserStats;
  error?: string;
}> => {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get groups count
    const { data: groupsData } = await supabase
      .from('group_members')
      .select('group_id, groups(status)')
      .eq('user_id', user.id);

    const totalGroups = groupsData?.length || 0;
    const activeGroups = groupsData?.filter((gm: any) => gm.groups?.status === 'active').length || 0;
    const completedGroups = groupsData?.filter((gm: any) => gm.groups?.status === 'completed').length || 0;

    // Get contributions stats - use single pass for efficiency
    const { data: contributionsData } = await supabase
      .from('contributions')
      .select('status, amount, due_date')
      .eq('user_id', user.id);

    // Calculate all stats in a single pass
    const now = new Date();
    const contribStats = (contributionsData || []).reduce((acc, c) => {
      if (c.status === 'paid') {
        acc.totalContributions++;
      } else if (c.status === 'pending') {
        if (new Date(c.due_date) >= now) {
          acc.pendingContributions++;
        } else {
          acc.overdueContributions++;
        }
      }
      return acc;
    }, { totalContributions: 0, pendingContributions: 0, overdueContributions: 0 });

    // Get payouts stats
    const { data: payoutsData } = await supabase
      .from('payouts')
      .select('amount, status')
      .eq('recipient_id', user.id);

    const totalPayouts = payoutsData?.filter(p => p.status === 'completed').length || 0;
    const upcomingPayouts = payoutsData?.filter(p => p.status === 'pending').length || 0;

    const stats: UserStats = {
      totalGroups,
      activeGroups,
      completedGroups,
      totalContributions: contribStats.totalContributions,
      totalPayouts,
      pendingContributions: contribStats.pendingContributions,
      overdueContributions: contribStats.overdueContributions,
      upcomingPayouts,
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Get user stats error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to fetch statistics'),
    };
  }
};
