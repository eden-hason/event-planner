import { ConfirmationPage } from '@/features/confirmation/components/confirmation-page';

export const dynamic = 'force-dynamic';

// Short RSVP path. Kept terse because the full URL is embedded in SMS bodies,
// where every character counts against the segment limit. /confirm/[token]
// renders the same page for links sent before this path existed.
export default async function ShortConfirmationRoute({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return <ConfirmationPage locale={locale} token={token} />;
}
