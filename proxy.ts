import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser, AUTH_COOKIE_NAME } from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? getSessionUser(token) : null;
  const isAuthenticated = !!user;

  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');

  // Allow auth API endpoints
  if (isAuthApi) {
    return NextResponse.next();
  }

  // Unauthenticated users trying to access protected pages
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users trying to access login page
  if (isAuthenticated && isLoginPage) {
    if (user.role === 'employee') {
      return NextResponse.redirect(new URL('/employee-portal', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Guard: If employee tries to access any admin pages, redirect to /employee-portal
  if (isAuthenticated && user.role === 'employee') {
    if (pathname !== '/employee-portal' && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/employee-portal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
