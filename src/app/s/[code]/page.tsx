import { SaveTheDatePage } from '@/features/schedules/components/save-the-date-page';

export const dynamic = 'force-dynamic';

// The link carried by the save-the-date SMS. Short for the same reason as
// /r/[code]: the full URL sits in an SMS body, where Hebrew text is UCS-2 and
// every character counts against the 70-character segment limit. Outside
// [locale] because the page is Hebrew-only.
export default async function SaveTheDateRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <SaveTheDatePage code={code} />;
}
