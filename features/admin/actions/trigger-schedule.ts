'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { getTemplateByKey } from '@/features/schedules/config/whatsapp-templates';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  sendInChunks,
  sendSmsToGuest,
  buildDeliveryRecord,
  generateConfirmationToken,
} from '@/features/schedules/utils';
import type { ParameterResolutionContext } from '@/features/schedules/utils/parameter-resolvers';
import { ScheduleDbToAppSchema } from '@/features/schedules/schemas';
import { DbToAppTransformerSchema } from '@/features/guests/schemas';
import type { GroupApp } from '@/features/guests/schemas';

export type TriggerScheduleResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

export async function triggerScheduleAdmin(scheduleId: string): Promise<TriggerScheduleResult> {
  const tag = `[trigger-schedule-admin] schedule=${scheduleId}`;
  console.log(`${tag} start`);

  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { data: scheduleRow, error: scheduleError } = await supabase
      .from('schedules')
      .select(`*, events (id, user_id, title, event_date, location, host_details, invitations)`)
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !scheduleRow || !scheduleRow.events) {
      console.error(`${tag} schedule fetch failed`, scheduleError);
      return { success: false, message: 'Schedule not found' };
    }

    if (scheduleRow.status === 'sent' || scheduleRow.status === 'cancelled') {
      return { success: false, message: `Cannot trigger a schedule with status: ${scheduleRow.status}` };
    }

    if (!scheduleRow.template_key) {
      return { success: false, message: 'No template assigned to this schedule' };
    }

    const templateConfig = getTemplateByKey(scheduleRow.template_key);
    if (!templateConfig) {
      return { success: false, message: 'Template not found' };
    }

    const eventRow = scheduleRow.events;
    const schedule = ScheduleDbToAppSchema.parse(scheduleRow);

    const eventContext = {
      id: eventRow.id,
      userId: eventRow.user_id,
      title: eventRow.title,
      eventDate: eventRow.event_date,
      location: eventRow.location ?? undefined,
      hostDetails: eventRow.host_details ?? undefined,
      invitations: eventRow.invitations ? { imageUrl: eventRow.invitations.image_url } : undefined,
    };

    const { data: guestRows, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventRow.id);

    if (guestError || !guestRows) {
      console.error(`${tag} guest fetch failed`, guestError);
      return { success: false, message: 'Failed to fetch guests' };
    }

    const allGuests = guestRows.map((g) => DbToAppTransformerSchema.parse(g));

    const targeted = filterGuestsByTarget(
      allGuests,
      schedule.targetStatus,
      schedule.actionType ?? undefined,
    );

    const guests = targeted.filter((g) => validatePhoneNumber(g.phone));

    if (guests.length === 0) {
      return { success: false, message: 'No eligible guests with valid phone numbers' };
    }

    const uniqueGroupIds = [...new Set(guests.map((g) => g.groupId).filter((id): id is string => !!id))];
    const groupsMap = new Map<string, GroupApp>();
    if (uniqueGroupIds.length > 0) {
      const { data: groupRows } = await supabase.from('groups').select('*').in('id', uniqueGroupIds);
      for (const row of groupRows ?? []) {
        groupsMap.set(row.id, {
          id: row.id,
          eventId: row.event_id,
          name: row.name,
          description: row.description ?? null,
          icon: row.icon ?? null,
          side: (row.side ?? null) as 'bride' | 'groom' | null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    }

    console.log(`${tag} sending to ${guests.length} guests via ${schedule.deliveryMethod}…`);

    let sendResults;

    if (schedule.deliveryMethod === 'sms') {
      sendResults = await Promise.allSettled(
        guests.map((guest) => {
          const confirmationToken = generateConfirmationToken();
          const context: ParameterResolutionContext = {
            guest,
            event: eventContext,
            group: null,
            schedule,
            confirmationToken,
          };
          return sendSmsToGuest({ guest, context, confirmationToken });
        }),
      );
    } else {
      if (!templateConfig.whatsapp?.parameters) {
        return { success: false, message: 'Template missing parameter configuration' };
      }
      const template = templateConfig.whatsapp;
      sendResults = await sendInChunks(guests, (guest) => {
        const confirmationToken = generateConfirmationToken();
        const context: ParameterResolutionContext = {
          guest,
          event: eventContext,
          group: guest.groupId ? (groupsMap.get(guest.groupId) ?? null) : null,
          schedule,
          confirmationToken,
        };
        return { context, template, confirmationToken };
      });
    }

    const deliveryRecords: Record<string, unknown>[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const settled of sendResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        deliveryRecords.push(buildDeliveryRecord(scheduleId, r, 'manual'));
        if (r.success) sentCount++;
        else {
          failedCount++;
          console.warn(`${tag} failed guestId=${r.guest.id} code=${r.errorCode ?? 'none'} msg=${r.message}`);
        }
      } else {
        failedCount++;
        console.error(`${tag} send promise rejected`, settled.reason);
      }
    }

    if (deliveryRecords.length > 0) {
      const { error: insertError } = await supabase.from('message_deliveries').insert(deliveryRecords);
      if (insertError) console.error(`${tag} delivery record insert failed`, insertError);
    }

    if (sentCount > 0) {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', scheduleId);
      if (updateError) console.error(`${tag} schedule status update failed`, updateError);
    }

    revalidatePath('/app');
    revalidatePath(`/admin/events/${eventRow.id}`);

    if (sentCount === 0) {
      return { success: false, message: 'All messages failed to send', sentCount: 0, failedCount };
    }

    const result = {
      success: true,
      message: `Sent ${sentCount} message${sentCount !== 1 ? 's' : ''}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      sentCount,
      failedCount,
    };
    console.log(`${tag} done`, result.message);
    return result;
  } catch (error) {
    console.error(`${tag} unexpected error`, error);
    return { success: false, message: 'Failed to trigger schedule' };
  }
}
