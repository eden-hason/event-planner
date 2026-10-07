import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/service';
import { VISITOR_COOKIE, VISITOR_DROPPED_COOKIE } from '../utils/visitor';

/**
 * The cookie half of ADR 0028's "an Event never moves to an existing account".
 *
 * Signing in to an existing account replaces the Visitor's session, and after
 * that nothing knows who the Visitor was. So the Visitor's id is remembered
 * before the sign-in starts and settled once it completes: the Visitor and
 * their Event are deleted, and the browser is told, once, that the Event was
 * not saved.
 *
 * The delete happens only after the sign-in succeeds. A Visitor who mistypes a
 * number that belongs to someone else, or backs out of Google, keeps their
 * Event.
 *
 * Unlike the rest of `services/`, this reads request cookies, so it is callable
 * only from Server Actions and route handlers.
 */

/** Remembers the Visitor about to sign in to an existing account. */
export async function rememberVisitor(visitorId: string): Promise<void> {
  const store = await cookies();
  store.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Long enough for an OTP or a Google round trip, short enough that a
    // sign-in abandoned today does not drop a draft started next week.
    maxAge: 60 * 30,
  });
}

/**
 * After a successful sign-in: forget the remembered Visitor, if any.
 *
 * `signedInUserId` guards the in-place upgrade - the user who just signed in is
 * never the one deleted. Deleting only an anonymous user also means a stale or
 * forged cookie can never remove a real account.
 */
export async function settleRememberedVisitor(signedInUserId: string): Promise<void> {
  const store = await cookies();
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!visitorId) return;
  store.delete(VISITOR_COOKIE);
  if (visitorId === signedInUserId) return;

  // forget_visitor deletes only an anonymous user, and their Event with them.
  const supabase = createServiceClient();
  const { data: forgotten, error } = await supabase.rpc('forget_visitor', {
    p_user_id: visitorId,
  });
  if (error) {
    // The Sweeper's purge will get to it; the person is signed in either way.
    console.error('[visitors] could not forget Visitor:', error.message);
    return;
  }
  if (!forgotten) return;

  // Read by the browser, which shows the one-time dialog and clears it.
  store.set(VISITOR_DROPPED_COOKIE, '1', {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
}

/** Whether a Visitor is remembered - i.e. this sign-in is to an existing account. */
export async function hasRememberedVisitor(): Promise<boolean> {
  const store = await cookies();
  return !!store.get(VISITOR_COOKIE)?.value;
}

/** Drops a remembered Visitor without deleting them: they are upgrading instead. */
export async function clearRememberedVisitor(): Promise<void> {
  const store = await cookies();
  store.delete(VISITOR_COOKIE);
}
