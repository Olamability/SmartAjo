import { updateSession } from '@/lib/server/middleware';
import { type NextRequest } from 'next/server';

/**
 * Root middleware for Supabase session management
 * 
 * This middleware:
 * 1. Runs on every request (see matcher config)
 * 2. Calls updateSession from @/lib/supabase/middleware
 * 3. Refreshes Supabase auth tokens automatically
 * 4. Sets/updates httpOnly auth cookies
 * 
 * The updateSession function is provided by the Supabase client library
 * and handles all the complexity of session management.
 * 
 * Without this middleware, users would be logged out when their
 * access token expires (typically after 1 hour).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
