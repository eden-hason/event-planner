'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconSearch, IconUserEdit } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { GuestApp, GroupWithGuestsApp } from '@/features/guests/schemas';
import { useAssignSaveFeedback } from '@/features/guests/hooks/use-assign-save-feedback';
import {
  matchesNameOrPhone,
  membershipStanding,
} from '@/features/guests/utils/group-assignment';
import { toggleOne } from '@/features/guests/utils/guest-selection';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { GroupIcon } from '../group-icon';
import { EditGuestSheet } from '../edit-guest-sheet';
import { SideBadge, sideTintClass } from '../../side-badge';
import { AssignRow } from './assign-row';

/**
 * The selected group, open for assigning: "no group" and "in the group" side by
 * side, each listing the group as saved. + / − only marks a row as pending to
 * move - it stays where it is, tinted, until Save moves it and highlights it
 * for a moment in its new column. The draft is the parent's, so it can guard against leaving with it
 * unsaved. Any row's pencil edits the record's details on top, without
 * touching the draft.
 */
export function AssignPanel({
  eventId,
  group,
  unassignedGuests,
  totalRecords,
  saved,
  draft,
  changes,
  onDraftChange,
  saving,
  onSave,
  onEdit,
}: {
  eventId: string;
  group: GroupWithGuestsApp;
  /** Records with no group - the only ones that can join from here. */
  unassignedGuests: GuestApp[];
  totalRecords: number;
  /** The group's members as saved. */
  saved: ReadonlySet<string>;
  draft: ReadonlySet<string>;
  /** What `draft` changes against `saved`. */
  changes: { added: number; removed: number; dirty: boolean };
  onDraftChange: (update: (prev: ReadonlySet<string>) => Set<string>) => void;
  saving: boolean;
  /** Resolves to whether the save landed. */
  onSave: () => Promise<boolean>;
  onEdit: () => void;
}) {
  const t = useTranslations('guests.groups');
  const tCommon = useTranslations('common');

  const [editingId, setEditingId] = useState<string | null>(null);
  const { flash, recordSave, clearLastSave, headline, summary } =
    useAssignSaveFeedback({ saved, draft, changes, totalRecords });

  const pool = useMemo(
    () => [...unassignedGuests, ...group.guests],
    [unassignedGuests, group.guests],
  );
  // Formatting parses each number, so it runs once per record, not per render.
  const phones = useMemo(
    () => new Map(pool.map((g) => [g.id, formatPhone(g.phone)])),
    [pool],
  );
  const outList = useMemo(
    () => pool.filter((g) => !saved.has(g.id)),
    [pool, saved],
  );
  const inList = useMemo(
    () => pool.filter((g) => saved.has(g.id)),
    [pool, saved],
  );
  const { dirty } = changes;

  const updateDraft = useCallback(
    (update: (prev: ReadonlySet<string>) => Set<string>) => {
      onDraftChange(update);
      clearLastSave();
    },
    [onDraftChange, clearLastSave],
  );

  const toggleMove = useCallback(
    (id: string) => updateDraft((prev) => toggleOne(prev, id)),
    [updateDraft],
  );

  const handleSave = async () => {
    if (!dirty || saving) return;
    const moved = pool.filter((g) => draft.has(g.id) !== saved.has(g.id));
    // A failed save keeps every mark, so it can be tried again.
    if (!(await onSave())) return;
    recordSave(
      moved.map((g) => g.id),
      changes,
    );
  };

  const editing = pool.find((g) => g.id === editingId) ?? null;

  const columnProps = {
    saved,
    draft,
    phones,
    flash,
    saving,
    onToggleMove: toggleMove,
    onEditGuest: setEditingId,
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-[18px] py-4">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            sideTintClass(group.side),
          )}
        >
          <GroupIcon iconName={group.icon} size="md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-[7px]">
            <h2 className="truncate text-[19px] leading-tight font-extrabold">
              {group.name}
            </h2>
            <SideBadge side={group.side} className="h-5 text-[11.5px]" />
          </div>
          <span
            className={cn(
              'truncate text-[13px]',
              group.description
                ? 'text-muted-foreground'
                : 'text-muted-foreground/70',
            )}
          >
            {group.description || t('mobile.noDescription')}
          </span>
        </div>
        <Button variant="outline" onClick={onEdit} className="font-semibold">
          <IconUserEdit size={16} />
          {t('mobile.menuEdit')}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <AssignColumn side="in" guests={inList} {...columnProps} />
        <AssignColumn side="out" guests={outList} {...columnProps} />
      </div>

      {/* Marked as a bottom bar, so the AI assistant's floating button lifts
          clear of Save */}
      <div
        data-bottom-bar
        className="flex items-center gap-2.5 border-t px-[18px] py-3"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <span className="text-[15px] font-extrabold whitespace-nowrap tabular-nums">
            {headline}
          </span>
          <span className={cn('truncate text-[13px]', summary.tone)}>
            {summary.text}
          </span>
        </div>
        <Button
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => updateDraft(() => new Set(saved))}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
          className="font-bold"
        >
          {t('mobile.saveButton')}
        </Button>
      </div>

      <EditGuestSheet
        variant="desktop"
        guest={editing}
        eventId={eventId}
        groupName={group.name}
        standing={editing && membershipStanding(editing.id, saved, draft)}
        pendingMoves={changes.added + changes.removed}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      />
    </>
  );
}

function AssignColumn({
  side,
  guests,
  saved,
  draft,
  phones,
  flash,
  saving,
  onToggleMove,
  onEditGuest,
}: {
  side: 'out' | 'in';
  /** This column's records, as saved. */
  guests: GuestApp[];
  saved: ReadonlySet<string>;
  draft: ReadonlySet<string>;
  phones: ReadonlyMap<string, string>;
  flash: ReadonlySet<string>;
  saving: boolean;
  onToggleMove: (id: string) => void;
  onEditGuest: (id: string) => void;
}) {
  const t = useTranslations('guests.groups');
  const isOut = side === 'out';
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => guests.filter((g) => matchesNameOrPhone(g, query)),
    [guests, query],
  );

  const empty = query.trim()
    ? 'noMatches'
    : isOut
      ? 'allAssigned'
      : 'emptyGroup';

  return (
    <div className={cn('flex min-h-0 flex-col', isOut && 'border-s')}>
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-2.5">
        <span className="flex h-8 items-center gap-[7px] whitespace-nowrap">
          <span className="text-[15px] font-extrabold">
            {isOut ? t('mobile.outTab') : t('mobile.inTab')}
          </span>
          <span className="text-primary text-sm font-bold tabular-nums">
            {guests.length}
          </span>
        </span>

        <div className="bg-card flex h-9 items-center gap-[7px] rounded-[10px] border px-[11px]">
          <IconSearch size={15} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('assignScreen.searchPlaceholder')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto px-2.5 pb-3">
        {visible.map((guest) => (
          <AssignRow
            key={guest.id}
            guest={guest}
            phone={phones.get(guest.id) ?? ''}
            standing={membershipStanding(guest.id, saved, draft)}
            flashed={flash.has(guest.id)}
            disabled={saving}
            onToggleMove={onToggleMove}
            onEdit={onEditGuest}
          />
        ))}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
            <span className="text-[15px] font-bold">
              {t(`assignScreen.${empty}Title`)}
            </span>
            <span className="text-muted-foreground text-[13px]">
              {empty === 'emptyGroup'
                ? t('desktop.emptyGroupHint')
                : t(`assignScreen.${empty}Hint`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
