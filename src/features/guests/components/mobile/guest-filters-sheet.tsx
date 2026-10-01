'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/toggle-switch';
import type { GroupSide, GroupWithGuestsApp } from '@/features/guests/schemas';
import {
  DEFAULT_GUEST_LIST_PARAMS,
  GUEST_SORT_KEYS,
  type GuestListParams,
} from '@/features/guests/utils/guest-list-params';
import { cn } from '@/lib/utils';
import { MobileSheet } from './mobile-sheet';

type Draft = Pick<GuestListParams, 'sort' | 'groups' | 'side' | 'noPhone'>;

const draftOf = (params: GuestListParams): Draft => ({
  sort: params.sort,
  groups: params.groups,
  side: params.side,
  noPhone: params.noPhone,
});

/**
 * "Filter and sort" on a phone. Unlike the desktop popover it is a draft: the
 * list underneath stays put while the Owner picks, and the button says how
 * many records the picks will show before they commit to them.
 */
export function GuestFiltersSheet({
  open,
  onOpenChange,
  params,
  groups,
  countFor,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: GuestListParams;
  groups: GroupWithGuestsApp[];
  /** Records the list would show with these filters, for the apply button. */
  countFor: (params: GuestListParams) => number;
  onApply: (patch: Draft) => void;
}) {
  const t = useTranslations('guests');
  const [draft, setDraft] = useState<Draft>(() => draftOf(params));
  // Every opening starts from what the list shows now.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(draftOf(params));
  }

  const patch = (next: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...next }));
  const toggleGroup = (id: string) =>
    patch({
      groups: draft.groups.includes(id)
        ? draft.groups.filter((groupId) => groupId !== id)
        : [...draft.groups, id],
    });

  const count = countFor({ ...params, ...draft });

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('list.mobile.filters.title')}
    >
      <Section title={t('list.sort')}>
        {GUEST_SORT_KEYS.map((key) => (
          <Chip
            key={key}
            on={draft.sort === key}
            onClick={() => patch({ sort: key })}
          >
            {t(`sort.${key}`)}
          </Chip>
        ))}
      </Section>

      <Section title={t('list.filters.group')}>
        {groups.length === 0 && (
          <span className="text-muted-foreground text-[13px]">
            {t('list.filters.noGroups')}
          </span>
        )}
        {groups.map((group) => (
          <Chip
            key={group.id}
            on={draft.groups.includes(group.id)}
            onClick={() => toggleGroup(group.id)}
          >
            {group.name}
          </Chip>
        ))}
      </Section>

      <Section title={t('list.filters.side')}>
        {(['bride', 'groom'] as GroupSide[]).map((side) => (
          <Chip
            key={side}
            on={draft.side === side}
            onClick={() => patch({ side: draft.side === side ? null : side })}
          >
            {t(`list.sides.${side}`)}
          </Chip>
        ))}
      </Section>

      <label className="flex min-h-[50px] items-center justify-between gap-3 text-[15px] font-medium">
        {t('list.filters.noPhoneOnly')}
        <Switch
          checked={draft.noPhone}
          onCheckedChange={(noPhone) => patch({ noPhone })}
        />
      </label>

      <div className="mt-1 flex gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setDraft({
              ...draftOf(DEFAULT_GUEST_LIST_PARAMS),
              // An issue scope from Home sorts by name; clearing keeps that.
              sort: params.issue ? 'name_asc' : DEFAULT_GUEST_LIST_PARAMS.sort,
            })
          }
          className="h-12 flex-1 rounded-xl text-[15px] font-bold"
        >
          {t('list.mobile.filters.clear')}
        </Button>
        <Button
          onClick={() => {
            onApply(draft);
            onOpenChange(false);
          }}
          className="h-12 flex-[1.6] rounded-xl text-[15px] font-bold"
        >
          {t('list.mobile.filters.show', { count })}
        </Button>
      </div>
    </MobileSheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-bold">{title}</span>
      <div className="flex flex-wrap gap-[7px]">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'flex h-9 max-w-full items-center gap-1.5 rounded-full border px-[13px] text-[13.5px]',
        on
          ? 'border-primary bg-primary/10 text-primary font-bold'
          : 'bg-card font-medium',
      )}
    >
      {on && <IconCheck size={14} stroke={2.6} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
}
