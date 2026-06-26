import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

class MockServerSupabaseClient {
  cookieVal: string | undefined;
  constructor(cookieVal: string | undefined) {
    this.cookieVal = cookieVal;
  }
  auth = {
    getUser: async () => {
      if (this.cookieVal === 'true') {
        return { data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'manager.402@mouzyerp.com' } } };
      }
      return { data: { user: null } };
    }
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url || url.includes('placeholder')) {
    const mockSession = cookieStore.get('sb-mock-session')?.value;
    return new MockServerSupabaseClient(mockSession) as any;
  }

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore if called during SSR
          }
        },
      },
    }
  );
}
