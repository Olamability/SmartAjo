// Core type definitions for Smart Ajo platform

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  createdAt: string;
  isVerified: boolean;
  isActive?: boolean;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  kycData?: Record<string, any>;
  bvn?: string;
  profileImage?: string;
  dateOfBirth?: string;
  address?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  contributionAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  totalMembers: number;
  currentMembers: number;
  securityDepositAmount: number;
  securityDepositPercentage: number; // Percentage of contribution
  status: 'forming' | 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  startDate?: string;
  endDate?: string;
  currentCycle: number;
  totalCycles: number;
  rotationOrder: string[]; // Array of user IDs
  members: GroupMember[];
  serviceFeePercentage: number; // Default 10%
}

export interface GroupMember {
  userId: string;
  userName: string;
  joinedAt: string;
  rotationPosition: number;
  securityDepositPaid: boolean;
  securityDepositAmount: number;
  status: 'active' | 'defaulted' | 'removed';
  totalContributions: number;
  totalPenalties: number;
  hasReceivedPayout: boolean;
  payoutDate?: string;
  payoutAmount?: number;
}

export interface Contribution {
  id: string;
  groupId: string;
  userId: string;
  amount: number;
  cycleNumber: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  dueDate: string;
  paidDate?: string;
  penalty: number;
  serviceFee: number;
  isOverdue?: boolean;
  transactionRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payout {
  id: string;
  relatedGroupId: string; // SQL: related_group_id
  recipientId: string; // SQL: recipient_id
  cycleNumber: number;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  groupId: string;
  type: 'contribution' | 'payout' | 'security_deposit' | 'penalty' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  description: string;
  reference: string;
}

export interface Penalty {
  id: string;
  groupId: string;
  userId: string;
  contributionId: string;
  amount: number;
  type: 'late_payment' | 'missed_payment' | 'early_exit'; // SQL: type field
  status: 'unpaid' | 'paid' | 'waived';
  appliedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 
    | 'payment_due' 
    | 'payment_received' 
    | 'payment_overdue' 
    | 'payout_ready' 
    | 'payout_processed' 
    | 'penalty_applied' 
    | 'group_complete' 
    | 'group_started' 
    | 'member_joined' 
    | 'member_removed' 
    | 'system_announcement';
  title: string;
  message: string;
  isRead: boolean; // SQL: is_read
  readAt?: string;
  createdAt: string;
  relatedGroupId?: string; // SQL: related_group_id
  relatedTransactionId?: string; // SQL: related_transaction_id
}

// Form types
export interface CreateGroupFormData {
  name: string;
  description: string;
  contributionAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  totalMembers: number;
  securityDepositPercentage: number;
  startDate: string;
}

export interface SignUpFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface KYCFormData {
  bvn: string;
  dateOfBirth: string;
  address: string;
}
