import Link from 'next/link';
import { getEventIdentity } from '@/features/admin/queries/events';

export default async function EventTopBar({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEventIdentity(eventId);
  return (
    <nav className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link href="/admin/events" className="hover:text-foreground">Events</Link>
      <span className="text-muted-foreground/50">/</span>
      <span className="text-foreground truncate font-medium">{event?.title ?? 'Event'}</span>
    </nav>
  );
}
