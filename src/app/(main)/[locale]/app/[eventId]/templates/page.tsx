import {
  TemplatesPage,
  TEMPLATE_LIBRARY,
  DEFAULT_TEMPLATE_ID,
  buildCoupleName,
  buildFormattedDate,
  buildTime,
  buildDishOptions,
  type HostDetails,
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
    const hostDetails = event.hostDetails as HostDetails;

    livePreviewData = {
      coupleName: buildCoupleName(hostDetails, event.title, event.eventType),
      formattedDate: buildFormattedDate(event.eventDate),
      time: buildTime(event.receptionTime, event.ceremonyTime, event.eventType),
      venue: event.location?.name,
      dishOptions: buildDishOptions(event.guestExperience),
      eventType: event.eventType,
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
