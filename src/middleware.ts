import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isMock = !url || url.includes('placeholder');

  let user: any = null;

  if (isMock) {
    const mockSession = request.cookies.get('sb-mock-session')?.value;
    if (mockSession === 'true') {
      user = { id: '00000000-0000-0000-0000-000000000099', email: 'manager.402@mouzyerp.com' };
    }
  } else {
    const supabase = createServerClient(
      url!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user: realUser },
    } = await supabase.auth.getUser();
    user = realUser;
  }

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApi = request.nextUrl.pathname.startsWith('/api');
  const isStatic = request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.');

  // If not logged in and trying to access app pages, redirect to login
  if (!user && !isLoginPage && !isApi && !isStatic && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access login, redirect to dashboard root
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
