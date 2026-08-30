'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toE164 } from '@/lib/phone';
import { sendNewUserAdminEmail } from '@/lib/email/send-new-user-admin-email';

export async function saveAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false };
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, avatar_url: avatarUrl });

  return { success: !error };
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: 'Not authenticated' };
  }

  const fullName = formData.get('full_name') as string | null;
  const phoneNumber = formData.get('phone_number') as string | null;
  const avatarUrl = formData.get('avatar_url') as string | null;
  const email = formData.get('email') as string | null;

  // A profile row can already exist before onboarding finishes - an avatar
  // upload or an accepted collaboration invitation both create a minimal one -
  // so row existence does not mark a registration. The transition of
  // initial_setup_complete to true does, and it happens exactly once.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('initial_setup_complete')
    .eq('id', user.id)
    .maybeSingle();
  const isNewRegistration = !existingProfile?.initial_setup_complete;

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    ...(fullName !== null && { full_name: fullName }),
    ...(phoneNumber !== null && { phone_number: toE164(phoneNumber) }),
    ...(avatarUrl !== null && { avatar_url: avatarUrl }),
    ...(email !== null && { email }),
    initial_setup_complete: true,
  });

  if (error) {
    return { success: false, message: 'Failed to save profile' };
  }

  if (isNewRegistration) {
    // Runs after the response is sent, so a slow or failing notification never
    // delays or fails the user's onboarding. A bare floating promise would risk
    // being cut off when the serverless invocation ends.
    after(async () => {
      const result = await sendNewUserAdminEmail({
        fullName,
        email: email ?? user.email ?? null,
        phoneNumber: toE164(phoneNumber) ?? phoneNumber,
        authProvider: user.app_metadata?.provider ?? null,
        registeredAt: new Date(),
      });

      if (!result.success && !result.skipped) {
        console.error('New user admin notification not sent:', result.error);
      }
    });
  }

  return { success: true, message: 'Profile saved' };
}

export async function logout() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Failed to logout. Please try again.' };
    }
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Failed to logout. Please try again.' };
  }

  // Only redirect on successful logout (outside try/catch)
  redirect('/login');
}

export async function sendOtp(
  prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const supabase = await createClient();

  const phone = formData.get('phone') as string;

  if (!phone) {
    return { success: false, message: 'Phone number is required' };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return {
      success: false,
      message: error.message || 'Failed to send verification code',
    };
  }

  return {
    success: true,
    message: 'Verification code sent',
  };
}

export async function verifyOtp(
  prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const supabase = await createClient();

  const phone = formData.get('phone') as string;
  const token = formData.get('token') as string;
  const next = (formData.get('next') as string) || '/app';

  if (!phone || !token) {
    return { success: false, message: 'Phone and verification code are required' };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Invalid verification code',
    };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();

  const headersList = await headers();
  const host =
    headersList.get('x-forwarded-host') ||
    headersList.get('host') ||
    'localhost:3000';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const baseUrl = `${isLocal ? 'http' : 'https'}://${host}`;

  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next || '/app')}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Google login failed',
    };
  }

  if (data.url) {
    redirect(data.url);
  }

  return {
    success: false,
    message: 'Failed to initiate Google login',
  };
}
