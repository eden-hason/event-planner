'use client';

import { useTranslations } from 'next-intl';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
};

/**
 * One save for the whole page, and it only exists while there is something to
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

  if (changes.length === 0) return null;

  const only = changes.length === 1 ? changes[0] : null;
  // The celebrant's name is gendered in Hebrew, and a bat mitzva takes the
  // feminine copy.
  const fieldKey =
    only === 'childName' && female ? 'childNameFemale' : only && FIELD_KEYS[only];

  return (
    <div
      className={cn(
        'bg-card sticky z-20 -mx-4 flex items-center gap-3 border-t px-4 pt-3 pb-3 sm:-mx-5 sm:px-5 md:mx-0 md:px-0',
        // Above the phone's bottom nav rather than behind it; from md the nav is
        // gone and the bar sits on the bottom edge.
        'bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] md:bottom-0',
      )}
    >
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
        {only && fieldKey
          ? t('pendingSingle', { field: t(`fields.${fieldKey}`) })
          : t('pending', { count: changes.length })}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={isSaving}
      >
        {t('cancel')}
      </Button>
      {/* The page's one form owns the submit, so Enter in a field saves too. */}
      <Button type="submit" size="sm" disabled={isSaving}>
        <IconDeviceFloppy className="size-4" />
        {isSaving ? t('saving') : t('save')}
      </Button>
    </div>
  );
}
