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

export async function logoutAction(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Clear the session cookie
    (await cookies()).delete('session');

    return {
      success: true,
      message: 'Successfully logged out',
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: 'Failed to logout',
    };
  }
}

export async function createSessionCookie(
  idToken: string,
): Promise<AuthResult> {
  // Ensure emulator environment variables are set
  if (process.env.NEXT_PUBLIC_APP_ENV === 'emulator') {
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.NEXT_PUBLIC_EMULATOR_FIRESTORE_PATH || 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      process.env.NEXT_PUBLIC_EMULATOR_AUTH_PATH || 'localhost:9099';
  }

  if (!auth) {
    return {
      success: false,
      message: 'Failed to create session',
    };
  }

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
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        avatar: userRecord.photoURL || '',
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
