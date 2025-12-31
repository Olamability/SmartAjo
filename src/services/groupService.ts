// Group management service with backend API integration
import { Group, CreateGroupFormData, Contribution } from '@/types';
import { api } from './api';
import { getAuthUser } from './auth';


export const createGroup = async (data: CreateGroupFormData): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    const currentUser = getAuthUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await api.post<Group>('/groups', data);

    if (response.success && response.data) {
      return { success: true, group: response.data };
    }

    return { success: false, error: response.error || 'Failed to create group' };
  } catch (error) {
    console.error('Create group error:', error);
    return { success: false, error: 'An error occurred while creating group' };
  }
};


export const joinGroup = async (groupId: string): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    const currentUser = getAuthUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await api.post<Group>(`/groups/${groupId}/join`);

    if (response.success && response.data) {
      return { success: true, group: response.data };
    }

    return { success: false, error: response.error || 'Failed to join group' };
  } catch (error) {
    console.error('Join group error:', error);
    return { success: false, error: 'An error occurred while joining group' };
  }
};


export const paySecurityDeposit = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = getAuthUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await api.post(`/groups/${groupId}/security-deposit`);

    if (response.success) {
      return { success: true };
    }

    return { success: false, error: response.error || 'Failed to process payment' };
  } catch (error) {
    console.error('Pay security deposit error:', error);
    return { success: false, error: 'An error occurred while processing payment' };
  }
};


export const makeContribution = async (contributionId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = getAuthUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await api.post(`/contributions/${contributionId}/pay`);

    if (response.success) {
      return { success: true };
    }

    return { success: false, error: response.error || 'Failed to process contribution' };
  } catch (error) {
    console.error('Make contribution error:', error);
    return { success: false, error: 'An error occurred while processing contribution' };
  }
};

export const getMyGroups = async (): Promise<Group[]> => {
  try {
    const currentUser = getAuthUser();
    if (!currentUser) return [];

    const response = await api.get<Group[]>('/groups/my-groups');

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get my groups error:', error);
    return [];
  }
};

export const getAvailableGroupsToJoin = async (): Promise<Group[]> => {
  try {
    const response = await api.get<Group[]>('/groups/available');

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get available groups error:', error);
    return [];
  }
};

export const getGroupById = async (groupId: string): Promise<Group | null> => {
  try {
    const response = await api.get<Group>(`/groups/${groupId}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Get group error:', error);
    return null;
  }
};

export const getGroupContributions = async (groupId: string): Promise<Contribution[]> => {
  try {
    const response = await api.get<Contribution[]>(`/groups/${groupId}/contributions`);

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get group contributions error:', error);
    return [];
  }
};
