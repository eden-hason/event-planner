import { assertPartner } from '@/features/partners/queries';
import { PartnerShell } from '@/features/partners';

// The page reads the session cookie, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function PartnersHomePage() {
  const session = await assertPartner();

  return (
    <PartnerShell session={session}>
      <div className="bg-background rounded-lg border p-6">
        <h1 className="text-xl font-semibold">ברוכים הבאים</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          זהו שלד תוכנית השותפים. קוד ההפניה, ההרשמות שהגיעו דרככם והזיכויים
          שנצברו יופיעו כאן
        </p>
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="text-muted-foreground">מזהה משתמש</dt>
            <dd dir="ltr" className="font-mono text-xs">
              {session.userId}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="text-muted-foreground">חשבון</dt>
            <dd dir="ltr">{session.email ?? session.phone ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </PartnerShell>
  );
}
