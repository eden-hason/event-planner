import { createClient } from '@/lib/supabase/server';
import type { User, ProfileData } from '../schemas';

export async function getUserProfile(): Promise<ProfileData | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone_number, email, initial_setup_complete')
      .eq('id', user.id)
      .single();

    return {
      fullName:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '',
      email: profile?.email || user.email || '',
      phoneNumber: profile?.phone_number || '',
      avatarUrl:
        profile?.avatar_url ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        '',
      initialSetupComplete: profile?.initial_setup_complete ?? false,
    };
  } catch {
    return null;
  }
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
      email: user.email || undefined,
      phone: user.phone || undefined,
      displayName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        user.phone ||
        '',
      avatar:
        user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
