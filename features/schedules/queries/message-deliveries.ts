'use server';

import { createClient } from '@/lib/supabase/server';
import {
  GuestInteractionDbToAppSchema,
  MessageDeliveryDbToAppSchema,
  type MessageDeliveryApp,
} from '../schemas';
import {
  type ActivityStatus,
  type DeliveryActivityPage,
  type DeliveryActivityRow,
} from '../types';

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
    .select('status, read_at')
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
    else if (record.status === 'read') { stats.successful++; }
    else if (record.status === 'failed') stats.failed++;
    if (record.read_at !== null) stats.read++;
  }

  return stats;
}

const PAGE_SIZE = 10;

function latestOf(...timestamps: (string | null | undefined)[]): string {
  return timestamps.filter(Boolean).sort().reverse()[0] ?? '';
}

/**
 * Fetches delivery activity for a schedule: engaged guests (read/confirmed/declined)
 * plus any failed deliveries. RSVP status takes precedence over read status.
 */
export async function getDeliveryActivity(
  scheduleId: string,
  page: number,
  pageSize = PAGE_SIZE,
  search = '',
  statusFilter: ActivityStatus[] = [],
): Promise<DeliveryActivityPage> {
  const supabase = await createClient();

  const [deliveryResult, interactionResult] = await Promise.all([
    supabase
      .from('message_deliveries')
      .select('id, status, sent_at, delivered_at, read_at, error_message, error_code, guest_id, guests(name, phone_number)')
      .eq('schedule_id', scheduleId),
    supabase
      .from('guest_interactions')
      .select('guest_id, interaction_type, created_at, metadata')
      .eq('schedule_id', scheduleId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('created_at', { ascending: false }),
  ]);

  if (deliveryResult.error) {
    console.error('Error fetching delivery activity:', deliveryResult.error);
    return { rows: [], total: 0 };
  }

  // Build RSVP map — latest per guest (data is ordered desc so first wins)
  const rsvpMap = new Map<
    string,
    { type: string; createdAt: string; metadata: { guestCount?: number; dietaryRestrictions?: string } | null }
  >();
  for (const record of interactionResult.data ?? []) {
    if (!rsvpMap.has(record.guest_id)) {
      const parsed = GuestInteractionDbToAppSchema.parse(record);
      rsvpMap.set(record.guest_id, {
        type: parsed.interactionType,
        createdAt: parsed.createdAt,
        metadata: parsed.metadata,
      });
    }
  }

  // Build rows for engaged guests (read/RSVP'd) and failed deliveries
  const allRows: DeliveryActivityRow[] = [];

  for (const d of deliveryResult.data ?? []) {
    const hasRead = d.read_at !== null;
    const hasFailed = d.status === 'failed';
    const rsvp = rsvpMap.get(d.guest_id);

    if (!hasRead && !rsvp && !hasFailed) continue;

    let activityStatus: ActivityStatus;
    let respondedAt: string | null = null;

    if (hasFailed && !rsvp && !hasRead) {
      activityStatus = 'failed';
    } else if (rsvp) {
      activityStatus = rsvp.type === 'rsvp_confirm' ? 'confirmed' : 'declined';
      respondedAt = rsvp.createdAt;
    } else {
      activityStatus = 'read';
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
      interactionMetadata: rsvp?.metadata ?? null,
      errorCode: (d as { error_code?: number | null }).error_code ?? null,
      errorMessage: hasFailed ? ((d as { error_message?: string | null }).error_message ?? null) : null,
    });
  }

  // Sort by most recent activity descending; failed rows (no timestamps) sort last
  allRows.sort((a, b) =>
    latestOf(b.readAt, b.respondedAt, b.sentAt).localeCompare(
      latestOf(a.readAt, a.respondedAt, a.sentAt),
    ),
  );

  let filtered = allRows;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) => r.guestName.toLowerCase().includes(q) || r.guestPhone.includes(q),
    );
  }
  if (statusFilter.length > 0) {
    filtered = filtered.filter((r) => statusFilter.includes(r.activityStatus));
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return { rows: filtered.slice(start, start + pageSize), total };
}

/**
 * Server Action wrapper for paginated delivery activity — for client-side calls.
 */
export async function fetchDeliveryActivityPage(
  scheduleId: string,
  page: number,
  pageSize: number,
  search = '',
  statusFilter: ActivityStatus[] = [],
): Promise<DeliveryActivityPage> {
  return getDeliveryActivity(scheduleId, page, pageSize, search, statusFilter);
}
