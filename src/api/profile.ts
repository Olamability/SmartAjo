/**
 * User Profile API
 * 
 * Handles user profile updates including bank account details
 */

import { createClient } from '@/lib/client/supabase';
import type { User } from '@/types';

export interface BankAccountData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  bankAccount?: BankAccountData;
}

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const supabase = createClient();
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }

    // Transform database user to app user format
    const user: User = {
      id: data.id,
      email: data.email,
      phone: data.phone,
      fullName: data.full_name,
      createdAt: data.created_at,
      isVerified: data.is_verified,
      isActive: data.is_active,
      isAdmin: data.is_admin,
      kycStatus: data.kyc_status === 'approved' ? 'verified' : data.kyc_status,
      kycData: data.kyc_data,
      profileImage: data.avatar_url,
      dateOfBirth: data.date_of_birth,
      address: data.address,
      updatedAt: data.updated_at,
      lastLoginAt: data.last_login_at,
      bankName: data.bank_name,
      accountNumber: data.account_number,
      accountName: data.account_name,
      bankCode: data.bank_code,
    };

    return { success: true, user };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return { success: false, error: 'Failed to fetch profile' };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    updates: UpdateProfileData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return { success: false, error: 'Not authenticated' };
      }
  
      // Prepare update data (convert from camelCase to snake_case)
      const updateData: Record<string, string | undefined> = {
        updated_at: new Date().toISOString(),
      };
  
      if (updates.fullName !== undefined) {
        updateData.full_name = updates.fullName;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone;
      }
      if (updates.address !== undefined) {
        updateData.address = updates.address;
      }
      if (updates.dateOfBirth !== undefined) {
        updateData.date_of_birth = updates.dateOfBirth;
      }
      if (updates.bankAccount) {
        updateData.bank_name = updates.bankAccount.bankName;
        updateData.account_number = updates.bankAccount.accountNumber;
        updateData.account_name = updates.bankAccount.accountName;
        updateData.bank_code = updates.bankAccount.bankCode;
      }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', authUser.id);

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Update bank account details only
 */
export async function updateBankAccount(
  bankAccount: BankAccountData
): Promise<{ success: boolean; error?: string }> {
  return updateUserProfile({ bankAccount });
}

/**
 * Check if user has bank account configured
 */
export async function hasBankAccount(): Promise<{ success: boolean; hasAccount: boolean; error?: string }> {
  try {
    const result = await getUserProfile();
    if (!result.success || !result.user) {
      return { success: false, hasAccount: false, error: result.error };
    }

    const hasAccount = !!(
      result.user.bankName &&
      result.user.accountNumber &&
      result.user.accountName &&
      result.user.bankCode
    );

    return { success: true, hasAccount };
  } catch (error) {
    console.error('Error checking bank account:', error);
    return { success: false, hasAccount: false, error: 'Failed to check bank account' };
  }
}

/**
 * List of Nigerian banks with their codes
 * This can be used for bank selection dropdown
 */
export const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
].sort((a, b) => a.name.localeCompare(b.name));
