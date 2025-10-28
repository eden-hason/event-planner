'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

export async function login(
  prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return {
      success: false,
      message: error.message || 'Login failed',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(
  prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return {
      success: false,
      message: error.message || 'Signup failed',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'; // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`;
  console.log('url:', url);
  console.log(
    'process.env.NEXT_PUBLIC_SITE_URL:',
    process.env.NEXT_PUBLIC_SITE_URL,
  );
  console.log(
    'process.env.NEXT_PUBLIC_VERCEL_URL:',
    process.env.NEXT_PUBLIC_VERCEL_URL,
  );
  return url;
};

export async function signInWithGoogle() {
  const supabase = await createClient();

  const redirectTo = `${getURL()}auth/callback?next=/dashboard`;

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
