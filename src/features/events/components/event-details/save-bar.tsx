'use client';

import { useTranslations } from 'next-intl';
import { PageSaveBar } from '@/components/page-save-bar';
import type { ChangeKey } from '../../utils/event-details-form';

/** The message key each change is named by in the bar. */
const FIELD_KEYS: Record<ChangeKey, string> = {
  eventDate: 'eventDate',
  receptionTime: 'receptionTime',
  ceremonyTime: 'ceremonyTime',
  location: 'location',
  invitation: 'invitation',
  brideName: 'brideName',
  brideParents: 'brideParents',
  groomName: 'groomName',
  groomParents: 'groomParents',
  childName: 'childName',
  childParents: 'childParents',
  specialMeal: 'specialMeal',
  meals: 'meals',
  lockGuestCount: 'lockGuestCount',
  sendTableNumbers: 'sendTableNumbers',
  askTransportation: 'askTransportation',
};

/**
 * One save for the whole page, and it only shows while there is something to
 * save.
 *
 * Replaces the per-section Save this page used to carry: an Owner correcting the
 * reception time and the venue in one sitting had to notice and press two
 * buttons, and a section they had edited but not saved looked no different from
 * one they had. A single change is named rather than counted - "one unsaved
 * change" tells you there is work left, not which.
 */
export function SaveBar({
  changes,
  female,
  onCancel,
  isSaving,
}: {
  changes: readonly ChangeKey[];
  female: boolean;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations('eventDetails.saveBar');

  const only = changes.length === 1 ? changes[0] : null;
  // The celebrant's name is gendered in Hebrew, and a bat mitzva takes the
  // feminine copy.
  const fieldKey =
    only === 'childName' && female
      ? 'childNameFemale'
      : only && FIELD_KEYS[only];

  return (
    <PageSaveBar
      open={changes.length > 0}
      count={changes.length}
      field={fieldKey ? t(`fields.${fieldKey}`) : undefined}
      isSaving={isSaving}
      onCancel={onCancel}
      // Capped like the page's content, so the buttons sit under it rather
      // than at the far edge of a wide screen.
      className="mx-auto max-w-6xl"
    />
  );
}
