'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import type { GroupWithGuestsApp } from '@/features/guests/schemas';
import type { GuestListParams } from '@/features/guests/utils/guest-list-params';
import { cn } from '@/lib/utils';

type Chip = { key: string; label: string; issue?: boolean; remove: () => void };

/**
 * The thin row of removable chips under the toolbar. It exists only while a
 * non-status filter is on - including the `?issue=` scope from Home's Guest
 * List Health Check.
 */
export function ActiveFilterChips({
  params,
  groups,
  issueCount,
  onChange,
  onClearAll,
  leading,
  className,
}: {
  params: GuestListParams;
  groups: GroupWithGuestsApp[];
  /** Rows the issue scope leaves, shown on its chip. */
  issueCount: number;
  onChange: (patch: Partial<GuestListParams>) => void;
  /** Without it there is no "clear all" - the phone's design leaves it out. */
  onClearAll?: () => void;
  /** A chip ahead of the filters', such as the phone's "N selected". */
  leading?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('guests');
  const nameOf = new Map(groups.map((group) => [group.id, group.name]));

  const chips: Chip[] = [
    ...(params.issue
      ? [
          {
            key: 'issue',
            label: `${t(`issues.${params.issue}`)} · ${issueCount}`,
            issue: true,
            remove: () => onChange({ issue: null }),
          },
        ]
      : []),
    ...params.groups
      .filter((id) => nameOf.has(id))
      .map((id) => ({
        key: `group-${id}`,
        label: t('list.chips.group', { name: nameOf.get(id)! }),
        remove: () =>
          onChange({
            groups: params.groups.filter((groupId) => groupId !== id),
          }),
      })),
    ...(params.side
      ? [
          {
            key: 'side',
            label: t('list.chips.side', {
              side: t(`list.sides.${params.side}`),
            }),
            remove: () => onChange({ side: null }),
          },
        ]
      : []),
    ...(params.noPhone
      ? [
          {
            key: 'noPhone',
            label: t('list.chips.noPhone'),
            remove: () => onChange({ noPhone: false }),
          },
        ]
      : []),
  ];

  if (chips.length === 0 && !leading) return null;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 pb-2.5', className)}
    >
      {leading}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={t('list.chips.remove', { label: chip.label })}
          className={cn(
            'flex h-7 max-w-full items-center gap-1.5 rounded-full border ps-2.5 pe-2 text-[12.5px] font-semibold',
            chip.issue
              ? 'bg-rsvp-pending-tint text-rsvp-pending-strong border-transparent'
              : 'bg-primary/8 text-primary border-primary/40 border-dashed',
          )}
        >
          {chip.issue && <IconAlertTriangle size={14} className="shrink-0" />}
          <span className="truncate">{chip.label}</span>
          <IconX size={13} stroke={2.4} className="shrink-0" />
        </button>
      ))}
      {onClearAll && chips.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-primary px-1 text-[12.5px] font-semibold hover:underline"
        >
          {t('list.chips.clearAll')}
        </button>
      )}
    </div>
  );
}
