import { shapeHasGift, type MessageShape, type Stage } from '../shape';
import {
  personalBody,
  type BodyPart,
  type MessageButton,
  type Wrapper,
} from '../message-parts';
import { eventReminderStage } from './event-reminder';
import { followUpStage } from './follow-up';
import { invitationStage } from './invitation';
import { thankYouStage } from './thank-you';
import type { StageDefinition, TemplateCategory } from './types';

export {
  invitationStage,
  INVITATION_KULULU_BODY,
  INVITATION_WRAPPER,
} from './invitation';
export {
  followUpStage,
  FOLLOW_UP_KULULU_BODY,
  FOLLOW_UP_WRAPPER,
} from './follow-up';
export {
  eventReminderStage,
  eventReminderKululuBody,
  EVENT_REMINDER_WRAPPER,
} from './event-reminder';
export {
  thankYouStage,
  THANK_YOU_KULULU_BODY,
  THANK_YOU_OPENING,
  THANK_YOU_CLOSING,
} from './thank-you';
export type { StageDefinition, TemplateCategory } from './types';

/** Every stage's definition, by stage. */
const STAGE_DEFINITIONS = {
  invitation: invitationStage,
  follow_up: followUpStage,
  event_reminder: eventReminderStage,
  thank_you: thankYouStage,
} as const satisfies { [S in Stage]: StageDefinition<MessageShape & { stage: S }> };

/** A stage's Wrapper. Only the Thank You's closing line follows the gift switch. */
export function wrapperFor(
  stage: Stage,
  options: { gift: boolean } = { gift: false },
): Wrapper {
  return STAGE_DEFINITIONS[stage].wrapper(options);
}

/** The body of a shape: its Kululu Wording, or its Wrapper around n paragraph variables. */
export function bodyFor(shape: MessageShape): readonly BodyPart[] {
  if (shape.wording === 'personal') {
    return personalBody(
      wrapperFor(shape.stage, { gift: shapeHasGift(shape) }),
      shape.paragraphs,
    );
  }
  switch (shape.stage) {
    case 'invitation':
      return invitationStage.kululuBody(shape);
    case 'follow_up':
      return followUpStage.kululuBody(shape);
    case 'event_reminder':
      return eventReminderStage.kululuBody(shape);
    case 'thank_you':
      return thankYouStage.kululuBody(shape);
  }
}

/** A shape's buttons, in Meta's index order. */
export function buttonsFor(shape: MessageShape): readonly MessageButton[] {
  switch (shape.stage) {
    case 'invitation':
      return invitationStage.buttons(shape);
    case 'follow_up':
      return followUpStage.buttons(shape);
    case 'event_reminder':
      return eventReminderStage.buttons(shape);
    case 'thank_you':
      return thankYouStage.buttons(shape);
  }
}

/** The category a shape's template was submitted under. */
export function submittedCategoryFor(shape: MessageShape): TemplateCategory {
  return STAGE_DEFINITIONS[shape.stage].submittedCategory[shape.wording];
}
