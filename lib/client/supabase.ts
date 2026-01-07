import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client if env vars are not set
    // This prevents build errors while maintaining type safety
    if (typeof window === 'undefined') {
      console.warn('Supabase environment variables not set during build - using placeholder');
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      );
    }
    
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
