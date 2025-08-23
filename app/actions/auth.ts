'use server';

import { auth } from '@/firebase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from '@/lib/auth';

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete('session');
  redirect('/login');
}

export async function createSessionCookie(
  idToken: string,
): Promise<AuthResult> {
  try {
    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    // Set cookie
    (await cookies()).set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Get user info
    const decodedToken = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decodedToken.uid);

    return {
      success: true,
      message: 'Successfully signed in',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
    };
  } catch (error) {
    console.error('Create session cookie error:', error);
    return {
      success: false,
      message: 'Failed to create session',
    };
  }
}
