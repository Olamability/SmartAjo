// Database-related constants

// PostgreSQL error codes
export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const;

// KYC Status conversion
export type DbKycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export type AppKycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

/**
 * Convert database kyc_status to application kycStatus
 * Database uses 'approved' but application uses 'verified'
 */
export function convertKycStatus(dbStatus: DbKycStatus): AppKycStatus {
  return dbStatus === 'approved' ? 'verified' : dbStatus as AppKycStatus;
}
