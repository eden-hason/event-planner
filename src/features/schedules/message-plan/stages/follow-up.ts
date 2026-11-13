import type { FollowUpShape } from '../shape';
import {
  RSVP_BUTTONS,
  valueVariable,
  type BodyPart,
} from '../message-parts';
import type { StageDefinition } from './types';

/**
 * A Follow-up: a repeat Ask, to pending Guests. Kululu Wording is the Classic
 * `confirmation_1_follow_up` plus the Owner's line "עדיין לא עדכנתם אם תגיעו"
 * (meta-templates doc 3.1). Header: the image or none, never the video.
 */
export const FOLLOW_UP_KULULU_BODY: readonly BodyPart[] = [
  'משפחה וחברים יקרים,\n',
  valueVariable('approachingLine'),
  '\nעדיין לא עדכנתם אם תגיעו\n\n📅 ',
  valueVariable('eventDate'),
  '\n📍 ',
  valueVariable('venueName'),
  '\n\nנשמח לדעת אם תגיעו 🙏🏼',
];

export const FOLLOW_UP_WRAPPER = {
  opening: 'עדיין מחכים לתשובה 💌',
  closing: 'נשמח לדעת אם תגיעו 👇',
} as const;

export const followUpStage: StageDefinition<FollowUpShape> = {
  stage: 'follow_up',
  kululuBody: () => [...FOLLOW_UP_KULULU_BODY],
  wrapper: () => FOLLOW_UP_WRAPPER,
  buttons: () => RSVP_BUTTONS,
  submittedCategory: { kululu: 'MARKETING', personal: 'MARKETING' },
};
