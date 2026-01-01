// Authentication service for MVP (local storage based)
import { User, SignUpFormData, LoginFormData } from '@/types';
import { getCurrentUser, setCurrentUser, getAllUsers, saveUser, getUserByEmail } from './storage';

// Generate a simple ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Mock password hashing (in production, this would be done server-side)
const hashPassword = (password: string): string => {
  // This is NOT secure - just for MVP demonstration
  return btoa(password);
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return btoa(password) === hashedPassword;
};

// Store passwords separately (in production, this would be in a secure database)
const PASSWORD_STORAGE_KEY = 'ajo_passwords';

const getPasswordStorage = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(PASSWORD_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const savePassword = (userId: string, hashedPassword: string): void => {
  const passwords = getPasswordStorage();
  passwords[userId] = hashedPassword;
  localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(passwords));
};

const getPassword = (userId: string): string | undefined => {
  return getPasswordStorage()[userId];
};

// Generate OTP (for email/phone verification)
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily
const OTP_STORAGE_KEY = 'ajo_otps';

const saveOTP = (identifier: string, otp: string): void => {
  const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
  otps[identifier] = {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
};

const verifyOTP = (identifier: string, otp: string): boolean => {
  const otps = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || '{}');
  const stored = otps[identifier];
  
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) return false;
  
  return stored.code === otp;
};

// Authentication functions
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Validate data
    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Check if user already exists
    const existingUser = getUserByEmail(data.email);
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Create new user
    const user: User = {
      id: generateId(),
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
      createdAt: new Date().toISOString(),
      isVerified: false,
      kycStatus: 'not_started',
    };

    // Save user and password
    saveUser(user);
    savePassword(user.id, hashPassword(data.password));

    // Generate and send OTP
    const otp = generateOTP();
    saveOTP(data.email, otp);
    
    // In production, send OTP via email/SMS
    console.log(`OTP for ${data.email}: ${otp}`);
    
    // For MVP, automatically log in after signup
    setCurrentUser(user);

    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Find user
    const user = getUserByEmail(data.email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const storedPassword = getPassword(user.id);
    if (!storedPassword || !verifyPassword(data.password, storedPassword)) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Set as current user
    setCurrentUser(user);

    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

export const logout = (): void => {
  setCurrentUser(null);
};

export const verifyUserEmail = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!verifyOTP(email, otp)) {
      return { success: false, error: 'Invalid or expired OTP' };
    }

    const user = getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    user.isVerified = true;
    saveUser(user);
    setCurrentUser(user);

    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'An error occurred during verification' };
  }
};

export const resendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const otp = generateOTP();
    saveOTP(email, otp);
    
    // In production, send OTP via email/SMS
    console.log(`New OTP for ${email}: ${otp}`);

    return { success: true };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, error: 'An error occurred while resending OTP' };
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const getAuthUser = (): User | null => {
  return getCurrentUser();
};

export const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const updatedUser = { ...currentUser, ...updates };
    saveUser(updatedUser);
    setCurrentUser(updatedUser);

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'An error occurred while updating profile' };
  }
};
