
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  } as ApiResponse<T>;
}

export function errorResponse(error: string, status: number = 400, details?: any) {
  return {
    success: false,
    error,
    ...(details && { details }),
  } as ApiResponse;
}

export function validationErrorResponse(errors: any) {
  return {
    success: false,
    error: 'Validation failed',
    details: errors,
  } as ApiResponse;
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return {
    success: false,
    error: message,
  } as ApiResponse;
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return {
    success: false,
    error: message,
  } as ApiResponse;
}

export function notFoundResponse(message: string = 'Resource not found') {
  return {
    success: false,
    error: message,
  } as ApiResponse;
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return {
    success: false,
    error: message,
  } as ApiResponse;
}

// Alias for successResponse
export function apiResponse<T>(data: T, message?: string) {
  return successResponse(data, message);
}

// Alias for errorResponse
export function apiError(error: string, status: number = 400, details?: any) {
  return errorResponse(error, status, details);
}
