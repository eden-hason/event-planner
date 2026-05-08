'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    ...(fullName !== null && { full_name: fullName }),
    ...(phoneNumber !== null && { phone_number: phoneNumber }),
    ...(avatarUrl !== null && { avatar_url: avatarUrl }),
    initial_setup_complete: true,
  });

  if (error) {
    return { success: false, message: 'Failed to save profile' };
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
