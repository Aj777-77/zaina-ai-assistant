import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the route is an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip middleware for the login page itself and static assets/api
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Check for the admin session cookie
    const sessionCookie = request.cookies.get('admin_session');
    
    // Very basic check against cookie existence and secret value
    const expectedSecret = process.env.COOKIE_SECRET || 'zaina_fallback_secret';
    
    if (!sessionCookie || sessionCookie.value !== expectedSecret) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
