import { createBrowserClient } from '@supabase/ssr';
import { MockSupabaseClient } from './mock';

let clientInstance: any = null;

export function createClient() {
  if (typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder')) {
      return new MockSupabaseClient() as any;
    }
    return createBrowserClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
    );
  }

  if (!clientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder')) {
      clientInstance = new MockSupabaseClient() as any;
    } else {
      clientInstance = createBrowserClient(
        url,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
      );
    }
  }
  return clientInstance;
}
