'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toE164 } from '@/lib/phone';
import { requestOrigin } from './origin';
import { updateUserProfile } from './auth';
import {
  clearRememberedVisitor,
  hasRememberedVisitor,
  rememberVisitor,
  settleRememberedVisitor,
} from '../services/visitor-session';
import {
  classifyUpgradeError,
  isVisitor,
  safeReturnPath,
  SAVE_NAME_COOKIE,
  SAVE_RETURN_COOKIE,
} from '../utils/visitor';

/**
 * Saving: a Visitor creating an account (ADR 0028).
 *
 * A new phone number or Google account upgrades the Visitor in place - same
 * user, so their Event and everything in it stays where it is. One that
 * already belongs to an account is never given the Event: the Visitor is told
 * first, and only if they choose to sign in to that account is their Event
 * discarded, once the sign-in has succeeded.
 */

export type SaveState = {
  success: boolean;
  message: string;
  /**
   * The number already has an account. No code was sent; the dialog asks
   * whether to use a different one or sign in and discard the Event.
   */
  existingAccount?: boolean;
  /**
   * Set by a successful verify. `saved`: the Visitor is now the Owner of their
   * Event. `signedIn`: they are in an account they already had, and the Event
   * they were planning is gone.
   */
  outcome?: 'saved' | 'signedIn';
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // Long enough for a Google round trip.
  maxAge: 60 * 30,
};

async function currentVisitor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, visitor: user && isVisitor(user) ? user : null };
}

const EXPIRED = 'Your session has expired, please start again';

/**
 * Sends the code. A new number gets the upgrade code straight away. A number
 * that already has an account gets nothing until the Visitor confirms, with
 * `discard`, that they want to sign in to it and give up this Event.
 */
export async function startPhoneSave(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const phone = toE164(formData.get('phone') as string | null);
  if (!phone) return { success: false, message: 'Phone number is required' };
  const discard = formData.get('discard') === '1';

  const { supabase, visitor } = await currentVisitor();
  if (!visitor) return { success: false, message: EXPIRED };

  if (!discard) {
    const { error } = await supabase.auth.updateUser({ phone });
    if (!error) {
      // A new number: this is an upgrade, whatever an earlier attempt decided.
      await clearRememberedVisitor();
      return { success: true, message: 'Verification code sent' };
    }
    if (classifyUpgradeError(error.code) === 'existing-account') {
      return { success: false, message: '', existingAccount: true };
    }
    return { success: false, message: error.message || 'Failed to send verification code' };
  }

  // Confirmed: sign in to the existing account. Remembered so the Event can be
  // discarded once - and only once - the sign-in succeeds.
  await rememberVisitor(visitor.id);
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });
  if (error) {
    return { success: false, message: error.message || 'Failed to send verification code' };
  }
  return { success: true, message: 'Verification code sent' };
}

/** Checks the code. A saved Visitor's name and phone become their profile. */
export async function verifyPhoneSave(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const phone = toE164(formData.get('phone') as string | null);
  const token = formData.get('token') as string | null;
  const fullName = ((formData.get('full_name') as string | null) ?? '').trim();
  if (!phone || !token) {
    return { success: false, message: 'Phone and verification code are required' };
  }

  const supabase = await createClient();
  const signingIn = await hasRememberedVisitor();

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: signingIn ? 'sms' : 'phone_change',
  });
  if (error || !data.user) {
    return { success: false, message: error?.message || 'Invalid verification code' };
  }

  if (signingIn) {
    await settleRememberedVisitor(data.user.id);
    revalidatePath('/', 'layout');
    return { success: true, message: 'Signed in', outcome: 'signedIn' };
  }

  const profile = new FormData();
  profile.set('full_name', fullName);
  profile.set('phone_number', phone);
  await updateUserProfile(profile);
  revalidatePath('/', 'layout');
  return { success: true, message: 'Your event is saved', outcome: 'saved' };
}

/**
 * Starts saving with Google. Linking the identity upgrades the Visitor in
 * place; the callback writes the profile and returns to `returnTo`. If that
 * Google account already has a Kululu account, it returns to `returnTo` with
 * `?save=exists`, and the dialog asks before anything is discarded.
 */
export async function startGoogleSave(
  fullName: string,
  returnTo: string,
): Promise<SaveState> {
  const { supabase, visitor } = await currentVisitor();
  if (!visitor) return { success: false, message: EXPIRED };

  // Google's own name is the fallback; what they typed wins.
  const store = await cookies();
  store.set(SAVE_NAME_COOKIE, fullName.trim().slice(0, 200), COOKIE_OPTIONS);
  store.set(SAVE_RETURN_COOKIE, safeReturnPath(returnTo), COOKIE_OPTIONS);

  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?save=1` },
  });
  if (error || !data.url) {
    return { success: false, message: error?.message || 'Google sign-in failed' };
  }
  redirect(data.url);
}

/**
 * The Visitor chose to sign in to the Google account that already exists,
 * giving up the Event they were planning. Discarded once the sign-in succeeds.
 */
export async function signInWithGoogleDiscarding(): Promise<SaveState> {
  const { supabase, visitor } = await currentVisitor();
  if (!visitor) return { success: false, message: EXPIRED };

  await rememberVisitor(visitor.id);
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=/app` },
  });
  if (error || !data.url) {
    return { success: false, message: error?.message || 'Google sign-in failed' };
  }
  redirect(data.url);
}
