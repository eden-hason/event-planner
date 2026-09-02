import { logout } from '@/features/auth';
import { Button } from '@/components/ui/button';
import type { PartnerSession } from '../types';

/**
 * The Partners app shell: a header identifying the signed-in Partner, and the
 * page under it. Intentionally thin - there is one page to navigate to, so
 * there is no navigation yet.
 */
// logout() resolves to an error object when sign-out fails and otherwise
// redirects, so its signature does not fit a <form action>. Awaiting it here
// keeps the header a Server Component - no client bundle for one button - and
// a failure simply leaves the Partner signed in on a re-rendered page, which
// is what the main app's menu does with the same return value.
async function signOut() {
  'use server';
  await logout();
}

export function PartnerShell({
  session,
  children,
}: {
  session: PartnerSession;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <span className="font-semibold">Kululu לשותפים</span>
          <div className="flex items-center gap-3">
            <span dir="ltr" className="text-muted-foreground hidden text-sm sm:inline">
              {session.email ?? session.phone}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                התנתקות
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
