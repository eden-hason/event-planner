import { headers } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import {
  isVisitor,
  parseSaveReason,
  safeReturnPath,
  SaveEventPage,
} from '@/features/auth';
import { getLastSignInMethod } from '@/features/auth/services/last-method';

export const dynamic = 'force-dynamic';

/**
 * Saving the Event (ADR 0028), on a page of its own rather than in a drawer a
 * stray tap could close. Outside the event layout on purpose: no sidebar, no
 * nav, nothing to leave by but the back button.
 *
 * `from` is where they opened it, `reason` the gated action that sent them,
 * and `exists=1` is Google's return with an account that already has one.
 */
export default async function SavePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; reason?: string; exists?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { from: rawFrom, reason, exists } = await searchParams;
  const from = safeReturnPath(rawFrom);

  // Claims rather than getUser(): checked locally with no auth round trip
  // before the page renders, and the Server Actions re-check on submit.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect({ href: '/login', locale });
  // Already saved - a second tab, or back after saving: nothing to do here.
  if (!isVisitor(data?.claims)) redirect({ href: from, locale });

  const h = await headers();
  const inAppBrowser = !!detectInAppBrowser(h.get('user-agent'), h.get('sec-ch-ua'));
  // A device that has signed in before may be someone with an account planning
  // as a Visitor; the mark leads them to the "already has an account" question
  // before they build a second Event.
  const lastMethod = await getLastSignInMethod();

  return (
    <SaveEventPage
      from={from}
      reason={parseSaveReason(reason)}
      startAt={exists === '1' ? 'googleExists' : 'details'}
      inAppBrowser={inAppBrowser}
      lastMethod={lastMethod}
    />
  );
}
