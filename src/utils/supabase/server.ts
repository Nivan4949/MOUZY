import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

class MockServerSupabaseClient {
  cookieVal: string | undefined;
  roleVal: string | undefined;
  emailVal: string | undefined;
  constructor(cookieVal: string | undefined, roleVal: string | undefined, emailVal: string | undefined) {
    this.cookieVal = cookieVal;
    this.roleVal = roleVal;
    this.emailVal = emailVal;
  }
  auth = {
    getUser: async () => {
      const role = this.roleVal || 'super_admin';
      const email = this.emailVal || 'manager.402@mouzyerp.com';
      return { 
        data: { 
          user: { 
            id: '00000000-0000-0000-0000-000000000099', 
            email: email,
            user_metadata: {
              tenant_id: '00000000-0000-0000-0000-000000000001',
              branch_id: '00000000-0000-0000-0000-000000000010',
              app_role: role
            }
          } 
        } 
      };
    }
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url || url.includes('placeholder')) {
    const mockSession = cookieStore.get('sb-mock-session')?.value;
    const mockRole = cookieStore.get('sb-mock-role')?.value;
    const mockEmail = cookieStore.get('sb-mock-email')?.value;
    return new MockServerSupabaseClient(mockSession, mockRole, mockEmail) as any;
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
