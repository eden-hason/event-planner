'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';

export type DeliveryMethodStats = {
  whatsapp: { successful: number; failed: number; total: number };
  sms: { successful: number; failed: number; total: number };
  overall: { successful: number; failed: number; total: number };
};

export async function getDeliveryMethodStats(
  scheduleId: string,
): Promise<DeliveryMethodStats> {
  const { supabase } = await getEffectiveClient();
  const empty: DeliveryMethodStats = {
    whatsapp: { successful: 0, failed: 0, total: 0 },
    sms: { successful: 0, failed: 0, total: 0 },
    overall: { successful: 0, failed: 0, total: 0 },
  };

  const { data, error } = await supabase
    .from('message_deliveries')
    .select('status, delivery_method')
    .eq('schedule_id', scheduleId);

  if (error || !data) {
    if (error) console.error('Error fetching delivery method stats:', error);
    return empty;
  }

  const result = structuredClone(empty);

  for (const record of data) {
    const method = record.delivery_method as 'whatsapp' | 'sms';
    const bucket = result[method];
    const isSuccessful = ['sent', 'delivered', 'read'].includes(record.status);
    const isFailed = record.status === 'failed';

    if (isSuccessful) { bucket.successful++; result.overall.successful++; }
    else if (isFailed) { bucket.failed++; result.overall.failed++; }

    bucket.total++;
    result.overall.total++;
  }

  return result;
}
