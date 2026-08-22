import { ReminderPage } from '@/features/schedules/components/reminder-page';

export const dynamic = 'force-dynamic';

// The link carried by every event reminder. Kept to one character plus the
// short code because the full URL is embedded in SMS bodies, where Hebrew text
// is UCS-2 and every character counts against the 70-character segment limit.
// Sits outside [locale] for the same reason - these pages are Hebrew-only, as
// /nav/[code] already is.
export default async function ReminderRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <ReminderPage code={code} />;
}
