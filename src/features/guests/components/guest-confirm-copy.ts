'use client';

import { useTranslations } from 'next-intl';
import { IconArmchair, IconMessage } from '@tabler/icons-react';
import type { ConfirmRequest } from '@/features/guests/hooks/use-guest-writes';

type RsvpRequest = Extract<ConfirmRequest, { kind: 'rsvp' }>;
type DeleteRequest = Extract<ConfirmRequest, { kind: 'delete' }>;

/**
 * What an RSVP confirm says, whatever shell shows it (the desktop dialog, the
 * phone sheet): the title, then one line per kind of fallout that applies.
 */
export function useRsvpConfirmCopy({ impact, status }: RsvpRequest) {
  const t = useTranslations('guests.list.confirmRsvp');
  const lines = [
    impact.answeredThemselves > 0 && {
      icon: IconMessage,
      text: t(status === 'confirmed' ? 'answeredDeclined' : 'answered', {
        count: impact.answeredThemselves,
      }),
    },
    impact.losingSeat > 0 && {
      icon: IconArmchair,
      text: t('losingSeat', { count: impact.losingSeat }),
    },
  ].filter(Boolean) as { icon: typeof IconMessage; text: string }[];

  return {
    title: t(`title.${status}`, { count: impact.changing }),
    lines,
    confirm: t(`confirm.${status}`),
    cancel: t('cancel'),
  };
}

/**
 * What a delete confirm says. `strong` is deleting the whole list, which both
 * shells set apart - a warning icon, and Cancel as the default.
 */
export function useDeleteConfirmCopy({ impact, singleName }: DeleteRequest) {
  const t = useTranslations('guests.list.confirmDelete');
  const strong = impact.isWholeList && impact.total > 1;
  const { messaged, answeredThemselves: answered } = impact;

  const body = singleName
    ? messaged + answered > 0
      ? t('bodyOneHistory')
      : null
    : messaged > 0 && answered > 0
      ? t('bodyBoth', { messaged, answered })
      : messaged > 0
        ? t('bodyMessaged', { messaged })
        : answered > 0
          ? t('bodyAnswered', { answered })
          : null;

  return {
    strong,
    title: singleName
      ? t('titleOne', { name: singleName })
      : strong
        ? t('titleAll', { count: impact.total })
        : t('title', { count: impact.total }),
    body,
    confirm: singleName
      ? t('confirmOne')
      : strong
        ? t('confirmAll', { count: impact.total })
        : t('confirm', { count: impact.total }),
    cancel: t('cancel'),
  };
}
