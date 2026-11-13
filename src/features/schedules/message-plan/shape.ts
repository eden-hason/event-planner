/**
 * The shape of a message on the current Message Plan (ADR 0053, 0054, 0055):
 * everything that picks its Meta template, and nothing else.
 *
 * A shape is a discriminated union so a shape Meta has no template for cannot
 * be written down: a Follow-up has no video, a Kululu Reminder has a day and a
 * table line but no paragraph count, a Personal Message Reminder has neither
 * day nor table (its Wrapper reads the same on any day, and the table is in the
 * Owner's own table sentence).
 */

export const STAGES = [
  'invitation',
  'follow_up',
  'event_reminder',
  'thank_you',
] as const;
export type Stage = (typeof STAGES)[number];

/**
 * The Schedule Type key each stage is stored under. The Thank You keeps the
 * existing `post_event` key; its template names say `thank_you`, as the
 * Classic `thank_you_1` does.
 */
export const STAGE_SCHEDULE_TYPE = {
  invitation: 'invitation',
  follow_up: 'follow_up',
  event_reminder: 'event_reminder',
  thank_you: 'post_event',
} as const satisfies Record<Stage, string>;

/** The stage a Schedule Type key belongs to, or null for any other type. */
export function stageOfScheduleType(
  key: string | null | undefined,
): Stage | null {
  for (const stage of STAGES) {
    if (STAGE_SCHEDULE_TYPE[stage] === key) return stage;
  }
  return null;
}

/** An Ask is an Invitation or a Follow-up: a message a Guest answers from. */
export function isAskStage(stage: Stage): stage is 'invitation' | 'follow_up' {
  return stage === 'invitation' || stage === 'follow_up';
}

export type Wording = 'kululu' | 'personal';

export const PARAGRAPH_COUNTS = [1, 2, 3] as const;
export type ParagraphCount = (typeof PARAGRAPH_COUNTS)[number];

export const INVITATION_ATTACHMENTS = ['image', 'video', 'none'] as const;
export type InvitationAttachment = (typeof INVITATION_ATTACHMENTS)[number];

/** A Follow-up attaches the image or nothing, never the video (ADR 0053). */
export const FOLLOW_UP_ATTACHMENTS = ['image', 'none'] as const;
export type FollowUpAttachment = (typeof FOLLOW_UP_ATTACHMENTS)[number];

export type Attachment = InvitationAttachment;

/**
 * Which Kululu Reminder wording: "today" when sent on the Event day, the
 * weekday and date when sent earlier. Never chosen, only the day is.
 */
export type ReminderDay = 'today' | 'dated';

export type InvitationShape =
  | { stage: 'invitation'; wording: 'kululu'; attachment: InvitationAttachment }
  | {
      stage: 'invitation';
      wording: 'personal';
      attachment: InvitationAttachment;
      paragraphs: ParagraphCount;
    };

export type FollowUpShape =
  | { stage: 'follow_up'; wording: 'kululu'; attachment: FollowUpAttachment }
  | {
      stage: 'follow_up';
      wording: 'personal';
      attachment: FollowUpAttachment;
      paragraphs: ParagraphCount;
    };

export type EventReminderShape =
  | {
      stage: 'event_reminder';
      wording: 'kululu';
      day: ReminderDay;
      /** This Guest has a table, so the table line is in. Per Guest. */
      table: boolean;
      gift: boolean;
    }
  | {
      stage: 'event_reminder';
      wording: 'personal';
      gift: boolean;
      paragraphs: ParagraphCount;
    };

export type ThankYouShape =
  | { stage: 'thank_you'; wording: 'kululu'; gift: boolean }
  | {
      stage: 'thank_you';
      wording: 'personal';
      gift: boolean;
      paragraphs: ParagraphCount;
    };

export type MessageShape =
  | InvitationShape
  | FollowUpShape
  | EventReminderShape
  | ThankYouShape;

/** The header a shape carries: the Asks' attachment, nothing on the others. */
export function shapeHeader(shape: MessageShape): 'image' | 'video' | null {
  return 'attachment' in shape && shape.attachment !== 'none'
    ? shape.attachment
    : null;
}

/** Whether a shape carries the gift button. */
export function shapeHasGift(shape: MessageShape): boolean {
  return 'gift' in shape && shape.gift;
}

/**
 * The Meta template name for a shape, by the pattern in
 * docs/design/message-plan-meta-templates.md section 1:
 *
 *   {stage}_{wording}[_{header}][_{day}][_tables][_gift][_p{n}]
 *
 * Suffix order is fixed. The switch is exhaustive, so a new shape cannot go
 * without a name.
 */
export function templateNameFor(shape: MessageShape): string {
  const parts: string[] = [shape.stage, shape.wording];
  const header = shapeHeader(shape);
  if (header) parts.push(header);
  if (shape.stage === 'event_reminder' && shape.wording === 'kululu') {
    parts.push(shape.day);
    if (shape.table) parts.push('tables');
  }
  if (shapeHasGift(shape)) parts.push('gift');
  if (shape.wording === 'personal') parts.push(`p${shape.paragraphs}`);
  return parts.join('_');
}

/** A base's three Personal Message shapes, one per paragraph count. */
function personalShapes<B extends { stage: Stage }>(base: B) {
  return PARAGRAPH_COUNTS.map((paragraphs) => ({
    ...base,
    wording: 'personal' as const,
    paragraphs,
  }));
}

/** Every shape the plan can send, in a stable order. One per Meta template. */
export function allShapes(): MessageShape[] {
  const shapes: MessageShape[] = [];
  const bools = [false, true] as const;

  for (const attachment of INVITATION_ATTACHMENTS) {
    shapes.push({ stage: 'invitation', wording: 'kululu', attachment });
    shapes.push(...personalShapes({ stage: 'invitation', attachment }));
  }
  for (const attachment of FOLLOW_UP_ATTACHMENTS) {
    shapes.push({ stage: 'follow_up', wording: 'kululu', attachment });
    shapes.push(...personalShapes({ stage: 'follow_up', attachment }));
  }
  for (const day of ['today', 'dated'] as const) {
    for (const table of bools) {
      for (const gift of bools) {
        shapes.push({
          stage: 'event_reminder',
          wording: 'kululu',
          day,
          table,
          gift,
        });
      }
    }
  }
  for (const gift of bools) {
    shapes.push(...personalShapes({ stage: 'event_reminder', gift }));
  }
  for (const gift of bools) {
    shapes.push({ stage: 'thank_you', wording: 'kululu', gift });
    shapes.push(...personalShapes({ stage: 'thank_you', gift }));
  }
  return shapes;
}
