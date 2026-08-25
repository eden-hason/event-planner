import Link from 'next/link';
import { getRoundDetail } from '@/features/admin/queries/call-round';

export default async function RoundTopBar({ params }: { params: Promise<{ eventId: string; roundId: string }> }) {
  const { eventId, roundId } = await params;
  const round = await getRoundDetail(roundId);
  return (
    <nav className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link href="/admin/events" className="hover:text-foreground">Events</Link>
      <span className="text-muted-foreground/50">/</span>
      <Link href={`/admin/events/${round?.eventId ?? eventId}`} className="hover:text-foreground truncate">{round?.eventTitle ?? 'Event'}</Link>
      <span className="text-muted-foreground/50">/</span>
      <span className="text-foreground truncate font-medium">{round?.title ?? 'Call round'}</span>
    </nav>
  );
}
