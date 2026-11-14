import { IconAlignRight, IconMovie, IconPhoto } from '@tabler/icons-react';

/**
 * The icon each attachment choice is shown with, on the Schedules page and on
 * the Event details page's media card, so both screens show a choice the same
 * way.
 */
export const ATTACHMENT_ICONS = {
  none: IconAlignRight,
  image: IconPhoto,
  video: IconMovie,
} as const;
