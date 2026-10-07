import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getImpersonation } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { User, ProfileData } from '../schemas';
import { isVisitor } from '../utils/visitor';

// Wrapped with React cache() so a single render resolves the auth call once,
// however many server components ask for it - the same reason getImpersonation
// and assertAdmin are cached in @/lib/supabase/admin.
export const getUserProfile = cache(async function getUserProfile(): Promise<ProfileData | null> {
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
});

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
      isVisitor: isVisitor(authUser),
    };
  } catch (error) {
    console.error('Get effective user error:', error);
    return null;
  }
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
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
      isVisitor: isVisitor(user),
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
});

/**
 * The Visitor's user id when the session is a Visitor's, otherwise null.
 *
 * Also the guard for anything a Visitor must save before doing - sending,
 * inviting, importing, paying (ADR 0028): `if (await getVisitorId())` refuse
 * with `SAVE_REQUIRED`.
 */
export const getVisitorId = cache(async function getVisitorId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user && isVisitor(user) ? user.id : null;
  } catch {
    return null;
  }
});
