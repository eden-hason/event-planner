import { getScheduleInteractionData } from '../queries/guest-interactions';
import { ScheduleResults } from './schedule-results';

interface ScheduleInteractionsCardProps {
  scheduleId: string;
  /**
   * Whether this schedule asks guests to RSVP (a Confirmation round). Other
   * message types still report who they reached, but an answer column that
   * reads "No response" on every row of a reminder is noise.
   */
  collectsRsvp: boolean;
  /**
   * The schedule's own channel. An SMS schedule has nothing WhatsApp-shaped to
   * report - no read receipts - so it gets none of that layout. A WhatsApp
   * schedule keeps the channel split, since SMS Fallback can reach some of its
   * guests over SMS.
   */
  channel: 'whatsapp' | 'sms' | null;
  /** When the schedule went out, for the live header */
  sentAt?: string;
}

/**
 * The Results tab of a sent Schedule: fetched here, drawn by
 * `ScheduleResults`. The render time travels with the data so every "2 min.
 * ago" on the page is measured from the same moment on server and client.
 */
export async function ScheduleInteractionsCard({
  scheduleId,
  collectsRsvp,
  channel,
  sentAt,
}: ScheduleInteractionsCardProps) {
  const data = await getScheduleInteractionData(scheduleId);

  return (
    <ScheduleResults
      data={data}
      collectsRsvp={collectsRsvp}
      channel={channel}
      sentAt={sentAt}
      renderedAt={new Date().toISOString()}
    />
  );
}
