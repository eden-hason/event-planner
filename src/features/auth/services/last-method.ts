import { cookies } from 'next/headers';
import {
  LAST_METHOD_COOKIE,
  LAST_METHOD_COOKIE_OPTIONS,
  parseSignInMethod,
  type SignInMethod,
} from '../utils/sign-in-method';

/**
 * The device's Last-used Method, so the sign-in screens can point at it next
 * time. Written wherever a sign-in or a save succeeds, never cleared: it is the
 * signed-out screens it is for.
 *
 * Like visitor-session, this reads request cookies, so it is callable only from
 * Server Actions, route handlers and server components (read only).
 */

export async function rememberSignInMethod(method: SignInMethod): Promise<void> {
  const store = await cookies();
  store.set(LAST_METHOD_COOKIE, method, LAST_METHOD_COOKIE_OPTIONS);
}

export async function getLastSignInMethod(): Promise<SignInMethod | undefined> {
  const store = await cookies();
  return parseSignInMethod(store.get(LAST_METHOD_COOKIE)?.value);
}
