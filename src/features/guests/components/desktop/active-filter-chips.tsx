'use client';

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
}: {
  params: GuestListParams;
  groups: GroupWithGuestsApp[];
  /** Rows the issue scope leaves, shown on its chip. */
  issueCount: number;
  onChange: (patch: Partial<GuestListParams>) => void;
  onClearAll: () => void;
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

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-2.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={t('list.chips.remove', { label: chip.label })}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-full border ps-2.5 pe-2 text-[12.5px] font-semibold',
            chip.issue
              ? 'bg-rsvp-pending-tint text-rsvp-pending-strong border-transparent'
              : 'bg-primary/8 text-primary border-primary/40 border-dashed',
          )}
        >
          {chip.issue && <IconAlertTriangle size={14} />}
          {chip.label}
          <IconX size={13} stroke={2.4} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-primary px-1 text-[12.5px] font-semibold hover:underline"
      >
        {t('list.chips.clearAll')}
      </button>
    </div>
  );
}
