/**
 * A Visitor is someone planning an Event without an account (ADR 0028).
 * In Supabase terms that is an anonymous user, but "anonymous" stays inside
 * this module: everywhere else the app speaks of Visitors.
 */

/** Anything that carries Supabase's anonymous flag - a user or JWT claims. */
type MaybeAnonymous = { is_anonymous?: boolean | null } | null | undefined;

export function isVisitor(user: MaybeAnonymous): boolean {
  return user?.is_anonymous === true;
}

/**
 * Supabase's error codes for "that phone / Google account already belongs to
 * someone". When saving they are not failures: they mean the Visitor already
 * has an account, and is asked before being signed in to it and their Event
 * discarded.
 *
 * Google gives `email_exists` when its email is already a Kululu user's, and
 * `identity_already_exists` when that Google account itself is linked to one.
 */
const EXISTING_ACCOUNT_CODES = new Set([
  'phone_exists',
  'email_exists',
  'identity_already_exists',
]);

export function isExistingAccountError(code: string | null | undefined): boolean {
  return !!code && EXISTING_ACCOUNT_CODES.has(code);
}

/**
 * What a Server Action returns when a Visitor tries something that needs an
 * account - sending, inviting, importing, paying (ADR 0028). The client gates
 * these up front with the save dialog, so this is the backstop.
 */
export const SAVE_REQUIRED = 'Save your event first';

/** Holds the Visitor's user id across a sign-in to an existing account. */
export const VISITOR_COOKIE = 'kululu_visitor';

/**
 * For the cookies that carry a save or sign-in across an OTP or a Google round
 * trip: long enough for that, short enough that a sign-in abandoned today does
 * not drop a draft started next week.
 */
export const ROUND_TRIP_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 30,
};

/**
 * Set once a Visitor has been forgotten. Read and cleared by the browser,
 * which shows the one-time "your event was not saved" dialog.
 */
export const VISITOR_DROPPED_COOKIE = 'kululu_visitor_dropped';

/** The name typed in the save dialog, carried across the Google round trip. */
export const SAVE_NAME_COOKIE = 'kululu_save_name';

/** Where the save dialog was opened, so the Google round trip returns there. */
export const SAVE_RETURN_COOKIE = 'kululu_save_return';

/** Only a path on this site may be returned to - never an absolute URL. */
export function safeReturnPath(path: string | null | undefined, fallback = '/app'): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}
