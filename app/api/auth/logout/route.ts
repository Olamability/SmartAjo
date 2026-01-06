import { clearAuthCookies } from '@/lib/server/auth';
import { successResponse, serverErrorResponse } from '@/lib/server/apiResponse';

export async function POST() {
  try {
    // Clear auth cookies
    await clearAuthCookies();

    return successResponse(null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return serverErrorResponse('Failed to logout');
  }
}
