import {
  TemplatesPage,
  TEMPLATE_LIBRARY,
  DEFAULT_TEMPLATE_ID,
  buildCoupleName,
  buildFormattedDate,
  buildTime,
  buildDishOptions,
} from '@/features/templates';
import { getEventById } from '@/features/events/queries';
import type { LivePreviewEventData } from '@/features/templates/components/live-template-preview';

export default async function TemplatesServerPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  let livePreviewData: LivePreviewEventData | undefined;
  if (event) {
    const hostDetails = event.hostDetails as
      | { bride?: { name?: string }; groom?: { name?: string } }
      | undefined;

    livePreviewData = {
      coupleName: buildCoupleName(hostDetails, event.title),
      formattedDate: buildFormattedDate(event.eventDate),
      time: buildTime(event.receptionTime, event.ceremonyTime),
      venue: event.location?.name,
      dishOptions: buildDishOptions(event.guestExperience),
    };
  }

  return (
    <TemplatesPage
      templates={TEMPLATE_LIBRARY}
      defaultSelectedId={event?.landingTemplateId ?? DEFAULT_TEMPLATE_ID}
      eventId={eventId}
      livePreviewData={livePreviewData}
    />
  );
}
