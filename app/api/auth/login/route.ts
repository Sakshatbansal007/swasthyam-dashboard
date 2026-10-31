import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateUser, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Healthcare ID and Password are required.' },
        { status: 400 }
      );
    }

    const user = authenticateUser(username, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid ID or Password. Please try again.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.username, user.role);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      username: user.username,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error processing authentication.' },
      { status: 500 }
    );
  }
}
