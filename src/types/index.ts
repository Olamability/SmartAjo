// Core type definitions for Smart Ajo platform

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  createdAt: string;
  isVerified: boolean;
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  bvn?: string;
  profileImage?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  contributionAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  totalMembers: number;
  currentMembers: number;
  securityDepositAmount: number;
  securityDepositPercentage: number; // Percentage of contribution
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  startDate?: string;
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
  cycle: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  dueDate: string;
  paidDate?: string;
  penalty: number;
  serviceFee: number;
  transactionRef?: string;
}

export interface Payout {
  id: string;
  groupId: string;
  userId: string;
  cycle: number;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  scheduledDate: string;
  processedDate?: string;
  transactionRef?: string;
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
  reason: 'late_payment' | 'missed_payment' | 'default';
  appliedAt: string;
  status: 'applied' | 'waived';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'payment_due' | 'payment_received' | 'payout_ready' | 'penalty_applied' | 'group_complete';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  groupId?: string;
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
