import { redirect } from '@/i18n/navigation';
import { getEventById } from '@/features/events/queries';
import { RecordPackagePage } from '@/features/billing';
import { getRecordPackagePageView } from '@/features/billing/queries';

/**
 * The Record Package and its payments. Reached from the More page on a phone and from the
 * sidebar on desktop; anyone but the Event's creator is sent home, since it carries money.
 */
export default async function PackagePageRoute({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  const [result, event] = await Promise.all([
    getRecordPackagePageView(eventId),
    getEventById(eventId),
  ]);

  if (!result.allowed) {
    return redirect({ href: `/app/${eventId}/home`, locale });
  }

  return <RecordPackagePage eventId={eventId} eventName={event?.title} view={result.view} />;
}
