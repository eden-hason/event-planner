'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function logout() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Failed to logout. Please try again.' };
    }

    // Redirect to login page after successful logout
    redirect('/login');
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Failed to logout. Please try again.' };
  }
}
