/**
 * A Sign-in Method is how someone proves who they are: a WhatsApp code to their
 * phone, or Google. Each method is its own account, so using the other one on a
 * new device opens an empty account rather than finding the Event (backlog 0029).
 */
export type SignInMethod = 'phone' | 'google';

/**
 * The Last-used Method: the one this device signed in with most recently. It
 * belongs to the device, so it outlives a sign-out, and a new device has none.
 */
export const LAST_METHOD_COOKIE = 'kululu_last_method';

export const LAST_METHOD_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // The most a browser will keep a cookie for.
  maxAge: 60 * 60 * 24 * 400,
};

export function parseSignInMethod(value: string | null | undefined): SignInMethod | undefined {
  return value === 'phone' || value === 'google' ? value : undefined;
}

export function otherSignInMethod(method: SignInMethod): SignInMethod {
  return method === 'phone' ? 'google' : 'phone';
}

type MaybeUser =
  | { phone?: string | null; identities?: { provider: string }[] | null }
  | null
  | undefined;

/**
 * The one method an account signs in with. An account with both (Google linked
 * onto a phone account, say) has no single "other" method, so it gets none.
 */
export function signInMethodOf(user: MaybeUser): SignInMethod | undefined {
  if (!user) return undefined;
  const google = !!user.identities?.some((identity) => identity.provider === 'google');
  const phone = !!user.phone;
  if (google === phone) return undefined;
  return google ? 'google' : 'phone';
}
