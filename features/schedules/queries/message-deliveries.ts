'use server';

import { createClient } from '@/lib/supabase/server';
import {
  MessageDeliveryDbToAppSchema,
  type ActivityStatus,
  type DeliveryActivityPage,
  type DeliveryActivityRow,
  type MessageDeliveryApp,
} from '../schemas';

/**
 * Fetches all message delivery records for a schedule.
 *
 * @param scheduleId - The schedule ID
 * @returns Array of message deliveries in app format
 */
export async function getMessageDeliveriesByScheduleId(
  scheduleId: string,
): Promise<MessageDeliveryApp[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('message_deliveries')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching message deliveries:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Transform DB records to app format
  return data.map((record) => MessageDeliveryDbToAppSchema.parse(record));
}

/**
 * Fetches delivery statistics for a schedule.
 *
 * @param scheduleId - The schedule ID
 * @returns Delivery statistics
 */
export async function getDeliveryStats(scheduleId: string): Promise<{
  successful: number; // sent + delivered + read (excludes failed)
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('message_deliveries')
    .select('status')
    .eq('schedule_id', scheduleId);

  if (error) {
    console.error('Error fetching delivery stats:', error);
    return {
      successful: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };
  }

  if (!data) {
    return {
      successful: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };
  }

  // Count statuses
  const stats = {
    successful: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };

  for (const record of data) {
    if (record.status === 'sent') { stats.sent++; stats.successful++; }
    else if (record.status === 'delivered') { stats.delivered++; stats.successful++; }
    else if (record.status === 'read') { stats.read++; stats.successful++; }
    else if (record.status === 'failed') stats.failed++;
  }

  return stats;
}

const PAGE_SIZE = 10;

function latestOf(...timestamps: (string | null | undefined)[]): string {
  return timestamps.filter(Boolean).sort().reverse()[0] ?? '';
}

/**
 * Fetches engaged delivery activity for a schedule (read/confirmed/declined guests only).
 * RSVP status takes precedence over read status.
 */
export async function getDeliveryActivity(
  scheduleId: string,
  page: number,
  pageSize = PAGE_SIZE,
): Promise<DeliveryActivityPage> {
  const supabase = await createClient();

  const [deliveryResult, interactionResult] = await Promise.all([
    supabase
      .from('message_deliveries')
      .select('id, sent_at, delivered_at, read_at, responded_at, guest_id, guests(name, phone_number)')
      .eq('schedule_id', scheduleId),
    supabase
      .from('guest_interactions')
      .select('guest_id, interaction_type, created_at')
      .eq('schedule_id', scheduleId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('created_at', { ascending: false }),
  ]);

  if (deliveryResult.error) {
    console.error('Error fetching delivery activity:', deliveryResult.error);
    return { rows: [], total: 0 };
  }

  // Build RSVP map — latest per guest (data is ordered desc so first wins)
  const rsvpMap = new Map<string, { type: string; createdAt: string }>();
  for (const record of interactionResult.data ?? []) {
    if (!rsvpMap.has(record.guest_id)) {
      rsvpMap.set(record.guest_id, {
        type: record.interaction_type,
        createdAt: record.created_at,
      });
    }
  }

  // Build rows for engaged guests only (read or RSVP'd)
  const allRows: DeliveryActivityRow[] = [];

  for (const d of deliveryResult.data ?? []) {
    const hasRead = d.read_at !== null;
    const rsvp = rsvpMap.get(d.guest_id);
    if (!hasRead && !rsvp) continue;

    let activityStatus: ActivityStatus = 'read';
    let respondedAt: string | null = null;

    if (rsvp) {
      activityStatus = rsvp.type === 'rsvp_confirm' ? 'confirmed' : 'declined';
      respondedAt = rsvp.createdAt;
    } else if (d.responded_at) {
      respondedAt = d.responded_at;
    }

    const guest = Array.isArray(d.guests) ? d.guests[0] : d.guests;

    allRows.push({
      id: d.id,
      guestName: (guest as { name: string } | null)?.name ?? 'Unknown',
      guestPhone: (guest as { phone_number: string } | null)?.phone_number ?? '',
      activityStatus,
      sentAt: d.sent_at,
      deliveredAt: d.delivered_at,
      readAt: d.read_at,
      respondedAt,
    });
  }

  // Sort by most recent engagement timestamp descending
  allRows.sort((a, b) =>
    latestOf(b.readAt, b.respondedAt).localeCompare(
      latestOf(a.readAt, a.respondedAt),
    ),
  );

  const total = allRows.length;
  const start = (page - 1) * pageSize;

  return { rows: allRows.slice(start, start + pageSize), total };
}

/**
 * Server Action wrapper for paginated delivery activity — for client-side calls.
 */
export async function fetchDeliveryActivityPage(
  scheduleId: string,
  page: number,
  pageSize: number,
): Promise<DeliveryActivityPage> {
  return getDeliveryActivity(scheduleId, page, pageSize);
}
