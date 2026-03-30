import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const expectedPassword = process.env.ADMIN_PASSWORD;
    const cookieSecret = process.env.COOKIE_SECRET || 'zaina_fallback_secret';

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD not set in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (password === expectedPassword) {
      // Create a response
      const response = NextResponse.json({ success: true, message: 'Login successful' });
      
      // Set an HTTP-only cookie indicating the user is an admin
      response.cookies.set({
        name: 'admin_session',
        value: cookieSecret,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return response;
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process login' }, { status: 500 });
  }
}
