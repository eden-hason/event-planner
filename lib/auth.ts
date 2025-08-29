import { auth } from '@/firebase/server';
import { cookies } from 'next/headers';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!auth) {
    return null;
  }

  try {
    const sessionCookie = (await cookies()).get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRecord = await auth.getUser(decodedClaims.uid);

    return {
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || '',
      avatar: userRecord.photoURL || '',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
