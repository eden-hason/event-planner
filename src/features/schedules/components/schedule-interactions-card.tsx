import { getScheduleInteractionData } from '../queries/guest-interactions';
import type { RsvpAsk } from '../utils/schedule-results';
import { ScheduleResults } from './schedule-results';

interface ScheduleInteractionsCardProps {
  scheduleId: string;
  /**
   * Whom this schedule asks to RSVP (see RsvpAsk). Other message types still
   * report who they reached, but an answer column that reads "No response" on
   * every row of a reminder is noise.
   */
  rsvpAsk: RsvpAsk;
  /**
   * The schedule's own channel. An SMS schedule has nothing WhatsApp-shaped to
   * report - no read receipts - so it gets none of that layout. A WhatsApp
   * schedule keeps the channel split, since SMS Fallback can reach some of its
   * guests over SMS.
   */
  channel: 'whatsapp' | 'sms' | null;
  /** When the schedule went out, for the live header */
  sentAt?: string;
  /** False under an SMS Fallback Opt-out: the Owner's screens show WhatsApp only. */
  smsFallback: boolean;
}

/**
 * The Results tab of a sent Schedule: fetched here, drawn by
 * `ScheduleResults`. The render time travels with the data so every "2 min.
 * ago" on the page is measured from the same moment on server and client.
 */
export async function ScheduleInteractionsCard({
  scheduleId,
  rsvpAsk,
  channel,
  sentAt,
  smsFallback,
}: ScheduleInteractionsCardProps) {
  const data = await getScheduleInteractionData(scheduleId, rsvpAsk);

  // Keyed so the filter and open guest reset when the pane switches schedule.
  return (
    <ScheduleResults
      key={scheduleId}
      data={data}
      collectsRsvp={rsvpAsk !== 'none'}
      channel={channel}
      sentAt={sentAt}
      smsFallback={smsFallback}
      renderedAt={new Date().toISOString()}
    />
  );
}
