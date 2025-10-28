import { createClient } from '@/utils/supabase/server';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      displayName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        '',
      avatar:
        user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
