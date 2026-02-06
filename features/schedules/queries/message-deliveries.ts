'use server';

import { createClient } from '@/lib/supabase/server';
import {
  MessageDeliveryDbToAppSchema,
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
  total: number;
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
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };
  }

  if (!data) {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };
  }

  // Count statuses
  const stats = {
    total: data.length,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };

  for (const record of data) {
    if (record.status === 'sent') stats.sent++;
    else if (record.status === 'delivered') stats.delivered++;
    else if (record.status === 'read') stats.read++;
    else if (record.status === 'failed') stats.failed++;
  }

  return stats;
}
