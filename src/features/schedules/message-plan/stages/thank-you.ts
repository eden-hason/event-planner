import type { ThankYouShape } from '../shape';
import {
  GIFT_BUTTON,
  valueVariable,
  type BodyPart,
} from '../message-parts';
import type { StageDefinition } from './types';

/**
 * The Thank You (Schedule Type `post_event`). Kululu Wording is `thank_you_1`
 * without the note (meta-templates doc 3.1). The gift button when switched on
 * and set up; no other button.
 */
export const THANK_YOU_KULULU_BODY: readonly BodyPart[] = [
  'תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל',
  valueVariable('occasionPhrase'),
  ' וחגגתם איתנו\n\nאוהבים ומעריכים ❤️',
];

export const THANK_YOU_OPENING = 'תודה מכל הלב ❤️';

/** The closing line leads to the gift button when there is one (brief 7.1). */
export const THANK_YOU_CLOSING = {
  withGift: 'לשליחת מתנה 👇',
  withoutGift: '❤️',
} as const;

export const thankYouStage: StageDefinition<ThankYouShape> = {
  stage: 'thank_you',
  kululuBody: () => [...THANK_YOU_KULULU_BODY],
  wrapper: ({ gift }) => ({
    opening: THANK_YOU_OPENING,
    closing: gift ? THANK_YOU_CLOSING.withGift : THANK_YOU_CLOSING.withoutGift,
  }),
  buttons: (shape) => (shape.gift ? [GIFT_BUTTON] : []),
  submittedCategory: { kululu: 'MARKETING', personal: 'MARKETING' },
};
