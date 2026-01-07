import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses a fetch Response as JSON with Content-Type validation
 * @param response - The fetch Response object
 * @param context - Optional context string for error logging (e.g., 'Signup', 'Login')
 * @returns Parsed JSON data if successful, or throws an error
 * @throws Error if response is not JSON
 */
export async function parseJsonResponse<T = any>(
  response: Response,
  context?: string
): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const errorContext = context ? `${context}: ` : '';
    const contentTypeInfo = contentType 
      ? `content-type: ${contentType.split(';')[0]}` 
      : 'no content-type header';
    console.error(`${errorContext}Expected JSON response but got ${contentTypeInfo}`);
    throw new Error('Invalid response format from server');
  }
  return response.json();
}

/**
 * Converts an error to a user-friendly message
 * Specifically handles invalid response format errors
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message === 'Invalid response format from server') {
    return 'Server error: Invalid response format';
  }
  return fallbackMessage;
}
