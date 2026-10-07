import {
  buildBackOfficeLink,
  escapeHtml,
  row,
  sendAdminNotification,
  type AdminNotificationResult,
} from './admin-notification';

interface SendVisitorEventAdminEmailParams {
  eventId: string;
  title: string | null;
  eventType: string | null;
  eventDate: string | null;
  venue: string | null;
  visitorId: string;
  createdAt: Date;
}

/**
 * Notifies the team when a Visitor finishes creating an event (ADR 0028). They
 * have no account yet, so this is the earliest a real lead shows up - the
 * new-user email only follows if and when they save.
 */
export async function sendVisitorEventAdminEmail({
  eventId,
  title,
  eventType,
  eventDate,
  venue,
  visitorId,
  createdAt,
}: SendVisitorEventAdminEmailParams): Promise<AdminNotificationResult> {
  const displayTitle = title?.trim() || 'Untitled event';

  return sendAdminNotification({
    subject: `Visitor created an event: ${displayTitle}`,
    heading: 'Visitor created an event',
    introHtml: `A Visitor just finished creating <strong>${escapeHtml(displayTitle)}</strong>. They have not saved an account yet.`,
    rowsHtml: [
      row('Event', title),
      row('Type', eventType),
      row('Date', eventDate),
      row('Venue', venue),
      row('Visitor id', visitorId),
      row('Created', createdAt.toISOString()),
    ].join(''),
    link: buildBackOfficeLink(`/events/${eventId}`),
    linkLabel: 'Open event in back office',
  });
}
