import { redirect } from 'next/navigation';
import { getPartnerSession } from '@/features/partners/queries';
import { PartnerLogin } from '@/features/partners';

// The page reads the session cookie, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function PartnersLoginPage() {
  // A Partner who already has a session on this host has no business on the
  // sign-in page. "/" rather than "/partners": on the Partners host the proxy
  // rewrites "/" here, and redirecting to "/partners" would rewrite a second
  // time, to "/partners/partners".
  if (await getPartnerSession()) redirect('/');

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <PartnerLogin />
    </div>
  );
}
