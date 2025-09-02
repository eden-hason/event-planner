'use client';

import { useState } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { logoutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    setIsLoading(true);

    try {
      // Sign out from Firebase Auth
      await firebaseSignOut(auth);

      // Clear server-side session
      const result = await logoutAction();

      if (result.success) {
        // Redirect to login page
        router.push('/login');
        router.refresh(); // Refresh to update server-side state
      } else {
        console.error('Logout failed:', result.message);
        // Even if server logout fails, we're signed out of Firebase
        // so redirect anyway
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to redirect to login
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return { logout, isLoading };
}
