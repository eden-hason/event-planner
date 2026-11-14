import type { Attachment } from '../message-plan';
import { isScheduleEditable } from './schedule-editable';

/**
 * What the Event details page shows and edits about the Asks' attachments on
 * the current Message Plan: the Invitation's choice (none, image or video) and
 * whether the Follow-ups carry the Event's image.
 *
 * The choice is stored per Schedule (`schedules.attachment`); the page edits
 * the Invitation's and every open Follow-up's at once. A sent Follow-up keeps
 * what it went out with.
 */
export interface MessageMediaState {
  invitation: { scheduleId: string; attachment: Attachment; editable: boolean } | null;
  followUps: {
    /** Every Follow-up, sent or not, so the page can say how many there are. */
    count: number;
    /** The open ones, the only ones a save writes. */
    editableIds: string[];
    /** True when the open Follow-ups (or, with none open, the sent ones) carry the image. */
    image: boolean;
  };
}

interface MediaScheduleInput {
  id: string;
  scheduleTypeKey: string;
  status: string | null;
  dispatchedAt?: string | null;
  attachment?: Attachment | null;
}

export function messageMediaState(schedules: readonly MediaScheduleInput[]): MessageMediaState {
  const invitation = schedules.find((schedule) => schedule.scheduleTypeKey === 'invitation');
  const followUps = schedules.filter((schedule) => schedule.scheduleTypeKey === 'follow_up');
  const open = followUps.filter((schedule) => isScheduleEditable(schedule));
  const judged = open.length ? open : followUps;

  return {
    invitation: invitation
      ? {
          scheduleId: invitation.id,
          attachment: invitation.attachment ?? 'none',
          editable: isScheduleEditable(invitation),
        }
      : null,
    followUps: {
      count: followUps.length,
      editableIds: open.map((schedule) => schedule.id),
      image: judged.length > 0 && judged.every((schedule) => schedule.attachment === 'image'),
    },
  };
}

/**
 * The Follow-ups' attachment: the Event's one image, or nothing. Whatever the
 * Invitation sends - beside an image Invitation it is the same picture, beside
 * a video or a text-only Invitation the Owner uploads it for the Follow-ups.
 * The video is the Invitation's alone, and there is no separate Follow-up
 * image (backlog 0040).
 */
export function followUpAttachment(carryImage: boolean): Attachment {
  return carryImage ? 'image' : 'none';
}
