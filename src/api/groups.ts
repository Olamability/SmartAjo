/**
 * Groups API Service
 * 
 * Handles all group-related operations using Supabase client.
 * All database operations are protected by Row Level Security (RLS) policies.
 */

import { createClient } from '@/lib/client/supabase';
import { Group, CreateGroupFormData } from '@/types';
import { getErrorMessage } from '@/lib/utils';

/**
 * Create a new Ajo group
 */
export const createGroup = async (
  data: CreateGroupFormData
): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Calculate security deposit amount
    const securityDepositAmount =
      (data.contributionAmount * data.securityDepositPercentage) / 100;

    // Insert group into database
    const { data: groupData, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description,
        created_by: user.id,
        contribution_amount: data.contributionAmount,
        frequency: data.frequency,
        total_members: data.totalMembers,
        security_deposit_amount: securityDepositAmount,
        security_deposit_percentage: data.securityDepositPercentage,
        status: 'forming',
        start_date: data.startDate,
        current_cycle: 1,
        total_cycles: data.totalMembers,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      group: {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        createdBy: groupData.created_by,
        contributionAmount: groupData.contribution_amount,
        frequency: groupData.frequency,
        totalMembers: groupData.total_members,
        currentMembers: 1, // Creator is the first member
        securityDepositAmount: groupData.security_deposit_amount,
        securityDepositPercentage: groupData.security_deposit_percentage,
        status: groupData.status,
        createdAt: groupData.created_at,
        startDate: groupData.start_date,
        currentCycle: groupData.current_cycle,
        totalCycles: groupData.total_cycles,
        rotationOrder: [],
        members: [],
        serviceFeePercentage: 10, // Default service fee
      },
    };
  } catch (error) {
    console.error('Create group error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to create group'),
    };
  }
};

/**
 * Get all groups for the current user
 */
export const getUserGroups = async (): Promise<{
  success: boolean;
  groups?: Group[];
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

    // Query groups where user is a member
    const { data, error } = await supabase
      .from('groups')
      .select(
        `
        *,
        group_members!inner(user_id)
      `
      )
      .eq('group_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      return { success: false, error: error.message };
    }

    const groups: Group[] = (data || []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.created_by,
      contributionAmount: group.contribution_amount,
      frequency: group.frequency,
      totalMembers: group.total_members,
      currentMembers: group.current_members || 0,
      securityDepositAmount: group.security_deposit_amount,
      securityDepositPercentage: group.security_deposit_percentage,
      status: group.status,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      startDate: group.start_date,
      endDate: group.end_date,
      currentCycle: group.current_cycle,
      totalCycles: group.total_cycles,
      rotationOrder: group.rotation_order || [],
      members: [],
      serviceFeePercentage: 10,
    }));

    return { success: true, groups };
  } catch (error) {
    console.error('Get groups error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to fetch groups'),
    };
  }
};

/**
 * Get a single group by ID
 */
export const getGroupById = async (
  groupId: string
): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Group not found' };
    }

    return {
      success: true,
      group: {
        id: data.id,
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        contributionAmount: data.contribution_amount,
        frequency: data.frequency,
        totalMembers: data.total_members,
        currentMembers: data.current_members || 0,
        securityDepositAmount: data.security_deposit_amount,
        securityDepositPercentage: data.security_deposit_percentage,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        startDate: data.start_date,
        endDate: data.end_date,
        currentCycle: data.current_cycle,
        totalCycles: data.total_cycles,
        rotationOrder: data.rotation_order || [],
        members: [],
        serviceFeePercentage: 10,
      },
    };
  } catch (error) {
    console.error('Get group error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to fetch group'),
    };
  }
};

/**
 * Join an existing group
 */
export const joinGroup = async (
  groupId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if group is still accepting members
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('status, total_members, current_members, security_deposit_amount')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return { success: false, error: 'Group not found' };
    }

    if (group.status !== 'forming') {
      return { success: false, error: 'Group is not accepting new members' };
    }

    if (group.current_members >= group.total_members) {
      return { success: false, error: 'Group is full' };
    }

    // Get the next position (max position + 1)
    const { data: maxPositionData } = await supabase
      .from('group_members')
      .select('position')
      .eq('group_id', groupId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = maxPositionData ? maxPositionData.position + 1 : 1;

    // Add user to group
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      position: nextPosition,
      status: 'active',
      has_paid_security_deposit: false,
      security_deposit_amount: group.security_deposit_amount,
    });

    if (error) {
      console.error('Error joining group:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Join group error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to join group'),
    };
  }
};
