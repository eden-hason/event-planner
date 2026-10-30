import { InvitationVideoPage } from '@/features/schedules/components/invitation-video-page';

export const dynamic = 'force-dynamic';

// The link carried by a Bespoke Template's SMS, which cannot carry the video
// the WhatsApp message does. Short for the same reason as /r/[code]: the full
// URL sits in an SMS body, where Hebrew text is UCS-2 and every character
// counts against the 70-character segment limit. Outside [locale] because the
// page is Hebrew-only.
export default async function InvitationVideoRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <InvitationVideoPage code={code} />;
}
