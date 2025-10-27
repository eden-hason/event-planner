import { cookies } from 'next/headers';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // TODO: Implement Supabase session verification
    // For now, return null to indicate no authentication
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
