// API-based storage service for backend integration
// This file provides API-based data access methods
import { Transaction, Notification, Contribution, User } from '@/types';
import { api } from './api';

// User storage operations
const CURRENT_USER_KEY = 'ajo_current_user';

export const getCurrentUser = (): User | null => {
  try {
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    if (!userData) return null;
    return JSON.parse(userData);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

// Transaction operations
export const getUserTransactions = async (): Promise<Transaction[]> => {
  try {
    // Backend filters by authenticated user automatically
    const response = await api.get<Transaction[]>('/transactions');

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get user transactions error:', error);
    return [];
  }
};

export const getGroupTransactions = async (groupId: string): Promise<Transaction[]> => {
  try {
    const response = await api.get<Transaction[]>(`/groups/${groupId}/transactions`);

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get group transactions error:', error);
    return [];
  }
};

// Contribution operations
export const getUserContributions = async (userId: string, groupId?: string): Promise<Contribution[]> => {
  try {
    // Build query params safely
    const params = new URLSearchParams();
    if (groupId) {
      params.append('groupId', groupId);
    }
    
    const url = `/contributions${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<Contribution[]>(url);

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get user contributions error:', error);
    return [];
  }
};

// Notification operations
export const getUserNotifications = async (): Promise<Notification[]> => {
  try {
    // Backend filters by authenticated user automatically
    const response = await api.get<Notification[]>('/notifications');

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Get user notifications error:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await api.patch(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Mark notification as read error:', error);
  }
};
