/**
 * Shared utilities for authentication operations
 */

/**
 * Parses atomic RPC response from create_user_profile_atomic function
 * Throws error if the operation failed
 * 
 * @param rpcResponse - Response from Supabase RPC call
 * @param operationName - Name of the operation (for error messages)
 */
export function parseAtomicRPCResponse(
  rpcResponse: { data?: any; error?: any },
  operationName: string
): void {
  if (rpcResponse.error) {
    throw new Error(`${operationName} failed: ${rpcResponse.error.message}`);
  }

  // Check result from atomic function
  if (rpcResponse.data && Array.isArray(rpcResponse.data) && rpcResponse.data.length > 0) {
    const result = rpcResponse.data[0];
    if (!result.success && result.error_message) {
      throw new Error(`${operationName} failed: ${result.error_message}`);
    }
  }
}

/**
 * Checks if an error is transient (network/timeout related)
 * Transient errors are worth retrying with exponential backoff
 * 
 * @param error - Error object or message
 * @returns true if error is transient, false otherwise
 */
export function isTransientError(error: any): boolean {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || '';
  
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection')
  );
}
