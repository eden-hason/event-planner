import type { InvitationShape } from '../shape';
import {
  RSVP_BUTTONS,
  valueVariable,
  type BodyPart,
} from '../message-parts';
import type { StageDefinition } from './types';

/**
 * The Invitation: the first Ask. Kululu Wording copied word for word from the
 * Classic `confirmation_1` (meta-templates doc 3.1). Header: the invitation
 * image, the video or none.
 */
export const INVITATION_KULULU_BODY: readonly BodyPart[] = [
  'משפחה וחברים יקרים,\nהוזמנתם ל',
  valueVariable('occasionPhrase'),
  '\n\n📅 ',
  valueVariable('eventDate'),
  '\n📍 ',
  valueVariable('venueName'),
  '\n\nנשמח לדעת אם תגיעו 🙏🏼',
];

export const INVITATION_WRAPPER = {
  opening: 'הזמנה לאירוע 💌',
  closing: 'נשמח לדעת אם תגיעו 👇',
} as const;

export const invitationStage: StageDefinition<InvitationShape> = {
  stage: 'invitation',
  kululuBody: () => [...INVITATION_KULULU_BODY],
  wrapper: () => INVITATION_WRAPPER,
  buttons: () => RSVP_BUTTONS,
  submittedCategory: { kululu: 'MARKETING', personal: 'MARKETING' },
};
