import 'server-only';

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponse<T>,
    { status }
  );
}

export function errorResponse(error: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
    } as ApiResponse,
    { status }
  );
}

export function validationErrorResponse(errors: any) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      details: errors,
    } as ApiResponse,
    { status: 422 }
  );
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ApiResponse,
    { status: 401 }
  );
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ApiResponse,
    { status: 403 }
  );
}

export function notFoundResponse(message: string = 'Resource not found') {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ApiResponse,
    { status: 404 }
  );
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ApiResponse,
    { status: 500 }
  );
}

// Alias for successResponse
export function apiResponse<T>(data: T, message?: string, status: number = 200) {
  return successResponse(data, message, status);
}

// Alias for errorResponse
export function apiError(error: string, status: number = 400, details?: any) {
  return errorResponse(error, status, details);
}
