'use client';

import { useTranslations } from 'next-intl';
import type { IplanScope, RsvpStatus } from '@/features/guests/utils';
import type { RsvpHeadcounts } from '@/features/guests/utils/rsvp-headcounts';

export type IplanExportOption = {
  scope: IplanScope;
  label: string;
  hint: string;
  /** Guests (the sum of amounts) the file would hold - the option's count. */
  people: number;
  /** Records the file would hold; none, and the option is off. */
  records: number;
};

/**
 * The three ways to export the whole list to iPlan, as both the desktop menu
 * and the phone's sheet offer them (Guests table controls design).
 */
export function useIplanExportOptions(
  counts: RsvpHeadcounts,
  statusCounts: Record<RsvpStatus | 'all', number>,
): IplanExportOption[] {
  const t = useTranslations('guests');
  const recordsHint = (count: number) => t('list.overview.records', { count });
  const comingOrWaiting = statusCounts.confirmed + statusCounts.pending;

  return [
    {
      scope: 'confirmed',
      label: t('directory.exportConfirmed'),
      hint:
        statusCounts.confirmed > 0
          ? recordsHint(statusCounts.confirmed)
          : t('list.exportMenu.noneConfirmed'),
      people: counts.confirmed,
      records: statusCounts.confirmed,
    },
    {
      scope: 'confirmedPending',
      label: t('directory.exportConfirmedPending'),
      hint: recordsHint(comingOrWaiting),
      people: counts.confirmed + counts.pending,
      records: comingOrWaiting,
    },
    {
      scope: 'all',
      label: t('directory.exportAll'),
      hint: t('list.exportMenu.allHint'),
      people: counts.total,
      records: statusCounts.all,
    },
  ];
}
