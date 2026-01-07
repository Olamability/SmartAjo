import { createClient } from '@/lib/supabase/server';
import { successResponse, serverErrorResponse } from '@/lib/server/apiResponse';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase Auth
    await supabase.auth.signOut();

    return successResponse(null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return serverErrorResponse('Failed to logout');
  }
}
