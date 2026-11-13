/**
 * What the RSVP page shows above the answer buttons: the image or video the
 * Delivery's Schedule attached, on the current Message Plan (ADR 0053). A
 * Guest who arrived from an SMS, which carries no media, sees what the
 * WhatsApp message would have shown.
 *
 * The same rule as the send: what the Schedule chose, when its stage offers
 * it (a Follow-up never the video) and the Event still has it. A Classic
 * Delivery, or one with no attachment, shows nothing here, so the page reads
 * as it always has.
 */

// Deep imports: both are pure, and the feature barrels carry Server Actions.
import { effectiveAttachment } from '@/features/schedules/message-plan/render';
import { stageOfScheduleType } from '@/features/schedules/message-plan/shape';

export type RsvpAttachment = { type: 'image' | 'video'; url: string };

export function rsvpAttachment(params: {
  messagePlan: string | null | undefined;
  scheduleTypeKey: string | null | undefined;
  attachment: string | null | undefined;
  imageUrl: string | null | undefined;
  videoUrl: string | null | undefined;
}): RsvpAttachment | null {
  if (params.messagePlan !== 'current') return null;
  const stage = stageOfScheduleType(params.scheduleTypeKey);
  if (stage !== 'invitation' && stage !== 'follow_up') return null;

  const requested =
    params.attachment === 'image' || params.attachment === 'video' ? params.attachment : null;
  const chosen = effectiveAttachment(stage, requested, {
    invitations: params.imageUrl ? { imageUrl: params.imageUrl } : null,
    invitationVideoUrl: params.videoUrl ?? null,
  });
  if (chosen === 'image' && params.imageUrl) return { type: 'image', url: params.imageUrl.trim() };
  if (chosen === 'video' && params.videoUrl) return { type: 'video', url: params.videoUrl.trim() };
  return null;
}
