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
  // Check for RPC-level errors first
  if (rpcResponse.error) {
    throw new Error(`${operationName} failed: ${rpcResponse.error.message}`);
  }

  // Check if data exists
  if (!rpcResponse.data) {
    throw new Error(`${operationName} failed: No data returned from RPC call`);
  }

  // For functions returning a single row, data might be an object or an array
  const result = Array.isArray(rpcResponse.data) 
    ? rpcResponse.data[0] 
    : rpcResponse.data;
  
  if (!result) {
    throw new Error(`${operationName} failed: Empty response from RPC call`);
  }

  // Check the success flag from the atomic function
  if (result.success === false || result.success === undefined || result.success === null) {
    const errorMsg = result.error_message || 'Unknown error - no success status returned';
    throw new Error(`${operationName} failed: ${errorMsg}`);
  }
  
  // If we get here, the operation was successful
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
