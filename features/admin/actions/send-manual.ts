'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { getTemplateByKey } from '@/features/schedules/config/whatsapp-templates';
import {
  sendInChunks,
  buildDeliveryRecord,
  generateConfirmationToken,
} from '@/features/schedules/utils/send-helpers';
import { validatePhoneNumber } from '@/features/schedules/utils';
import type { ParameterResolutionContext } from '@/features/schedules/utils/parameter-resolvers';
import type { GuestApp } from '@/features/guests/schemas';
import type { GroupApp } from '@/features/guests/schemas';
import { ScheduleDbToAppSchema } from '@/features/schedules/schemas';

export type ManualSendResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

export async function sendManualMessages(
  scheduleId: string,
  guestIds: string[],
): Promise<ManualSendResult> {
  if (guestIds.length === 0) {
    return { success: false, message: 'No guests selected' };
  }

  const tag = `[manual-send] schedule=${scheduleId} guests=${guestIds.length}`;
  console.log(`${tag} start`);

  try {
    await assertAdmin();
    const supabase = createServiceClient();

    // Fetch schedule + event via service client (bypasses RLS)
    const { data: scheduleRow, error: scheduleError } = await supabase
      .from('schedules')
      .select(`*, events (id, user_id, title, event_date, location, host_details, invitations)`)
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !scheduleRow || !scheduleRow.events) {
      console.error(`${tag} schedule fetch failed`, scheduleError);
      return { success: false, message: 'Schedule not found' };
    }

    if (!scheduleRow.template_key) {
      console.warn(`${tag} no template_key on schedule`);
      return { success: false, message: 'No template assigned to this schedule' };
    }

    const templateConfig = getTemplateByKey(scheduleRow.template_key);
    if (!templateConfig?.whatsapp?.parameters) {
      console.warn(`${tag} template not found: ${scheduleRow.template_key}`);
      return { success: false, message: 'Template not found or missing parameter config' };
    }

    const template = templateConfig.whatsapp;
    const eventRow = scheduleRow.events;

    console.log(`${tag} event="${eventRow.title}" template=${scheduleRow.template_key} action=${scheduleRow.action_type}`);

    const eventContext = {
      id: eventRow.id,
      userId: eventRow.user_id,
      title: eventRow.title,
      eventDate: eventRow.event_date,
      location: eventRow.location ?? undefined,
      hostDetails: eventRow.host_details ?? undefined,
      invitations: eventRow.invitations ? { imageUrl: eventRow.invitations.image_url } : undefined,
    };

    const schedule = ScheduleDbToAppSchema.parse(scheduleRow);

    // Fetch selected guests
    const { data: guestRows, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .in('id', guestIds)
      .eq('event_id', eventRow.id);

    if (guestError || !guestRows) {
      console.error(`${tag} guest fetch failed`, guestError);
      return { success: false, message: 'Failed to fetch guests' };
    }

    // Shape to GuestApp (trusted DB data — skip zod validation)
    const guests: GuestApp[] = guestRows
      .filter((g) => validatePhoneNumber(g.phone_number))
      .map((g) => ({
        id: g.id,
        eventId: g.event_id,
        name: g.name,
        phone: g.phone_number,
        groupId: g.group_id ?? undefined,
        rsvpStatus: (g.rsvp_status ?? 'pending') as 'pending' | 'confirmed' | 'declined',
        mealChoice: g.meal_choice ?? undefined,
        amount: g.amount ?? 1,
        notes: g.notes ?? undefined,
        side: (g.side ?? null) as 'bride' | 'groom' | null,
        tableId: g.table_id ?? null,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        invitationToken: g.invitation_token,
        rsvpChangedBy: g.rsvp_changed_by ?? null,
        rsvpChangedByName: g.rsvp_changed_by_name ?? null,
        rsvpChangedAt: g.rsvp_changed_at ?? null,
        rsvpChangeSource: (g.rsvp_change_source ?? null) as 'manual' | 'guest' | null,
        isOfflineRsvp: g.is_offline_rsvp ?? false,
      }));

    const skipped = guestRows.length - guests.length;
    console.log(`${tag} guests fetched=${guestRows.length} valid=${guests.length} skipped_no_phone=${skipped}`);

    if (guests.length === 0) {
      return { success: false, message: 'None of the selected guests have a valid phone number' };
    }

    // Batch-fetch groups
    const uniqueGroupIds = [
      ...new Set(guests.map((g) => g.groupId).filter((id): id is string => !!id)),
    ];
    const groupsMap = new Map<string, GroupApp>();
    if (uniqueGroupIds.length > 0) {
      const { data: groupRows } = await supabase
        .from('groups')
        .select('*')
        .in('id', uniqueGroupIds);
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
      console.log(`${tag} groups fetched=${groupsMap.size}`);
    }

    console.log(`${tag} sending…`);

    // Send in rate-limited chunks
    const sendResults = await sendInChunks(
      guests,
      (guest) => {
        const confirmationToken = generateConfirmationToken();
        const context: ParameterResolutionContext = {
          guest,
          event: eventContext,
          group: guest.groupId ? (groupsMap.get(guest.groupId) ?? null) : null,
          schedule,
          confirmationToken,
        };
        return { context, template, confirmationToken };
      },
      async (chunkResults, chunkIndex, totalChunks) => {
        const sent = chunkResults.filter(
          (r) => r.status === 'fulfilled' && r.value.success,
        ).length;
        const failed = chunkResults.length - sent;
        console.log(`${tag} chunk ${chunkIndex + 1}/${totalChunks} sent=${sent} failed=${failed}`);
      },
    );

    // Process results and insert delivery records
    const deliveryRecords: Record<string, unknown>[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const settled of sendResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        deliveryRecords.push(buildDeliveryRecord(scheduleId, r));
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

    console.log(`${tag} send complete sent=${sentCount} failed=${failedCount}`);

    if (deliveryRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('message_deliveries')
        .insert(deliveryRecords);
      if (insertError) {
        console.error(`${tag} delivery record insert failed`, insertError);
      } else {
        console.log(`${tag} inserted ${deliveryRecords.length} delivery records`);
      }
    }

    revalidatePath('/app');

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
    return { success: false, message: 'Failed to send messages' };
  }
}
