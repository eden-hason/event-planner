import { setRequestLocale } from 'next-intl/server';
import { SignOut } from './sign-out';

/**
 * A link to send someone whose device is holding a session they should not be
 * in - a duplicate account, a deleted one - so they land on /login. The GET
 * only renders; the sign-out itself is the `logout` Server Action the page
 * calls once it mounts, so a prefetch, a link-preview bot or an <img> pointed
 * here signs nobody out.
 *
 * Public in the middleware: with no session the action has nothing to end and
 * still lands on /login, rather than bouncing through /login?next=/signout and
 * signing the user out again right after they sign in.
 */
export default async function SignOutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignOut />;
}
