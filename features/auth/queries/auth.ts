import { createClient } from '@/lib/supabase/server';
import { getImpersonation } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
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

export async function getEffectiveUser(): Promise<User | null> {
  try {
    const impersonation = await getImpersonation();
    if (!impersonation) return getCurrentUser();

    const adminSupabase = createServiceClient();
    const { data } = await adminSupabase.auth.admin.getUserById(impersonation.userId);
    const authUser = data.user;
    if (!authUser) return null;

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, avatar_url, phone_number')
      .eq('id', impersonation.userId)
      .single();

    return {
      id: authUser.id,
      email: authUser.email || undefined,
      phone: profile?.phone_number || authUser.phone || undefined,
      displayName:
        profile?.full_name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email ||
        authUser.phone ||
        '',
      avatar:
        profile?.avatar_url ||
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        '',
    };
  } catch (error) {
    console.error('Get effective user error:', error);
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
