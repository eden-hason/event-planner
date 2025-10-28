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
