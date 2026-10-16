'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconMinus,
  IconPlus,
  IconSearch,
  IconUserEdit,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { GuestApp, GroupWithGuestsApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  headerState,
  toggleAllVisible,
  toggleOne,
  withoutIds,
} from '@/features/guests/utils/guest-selection';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';
import { GroupIcon } from '../group-icon';
import { SideBadge, sideTintClass } from '../../side-badge';
import { SelectBox } from '../../desktop/select-box';

/**
 * The selected group, open for assigning: "no group" and "in the group" side by
 * side. + / − and the column's bulk button only change a draft; nothing is
 * written until Save. The draft is the parent's, so it can guard against
 * leaving with it unsaved.
 */
export function AssignPanel({
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
  group: GroupWithGuestsApp;
  /** Records with no group - the only ones that can join from here. */
  unassignedGuests: GuestApp[];
  totalRecords: number;
  /** The group's members as saved. */
  saved: ReadonlySet<string>;
  draft: ReadonlySet<string>;
  /** What `draft` changes against `saved`. */
  changes: { added: number; removed: number; dirty: boolean };
  onDraftChange: (next: Set<string>) => void;
  saving: boolean;
  onSave: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations('guests.groups');
  const tCommon = useTranslations('common');

  const pool = useMemo(
    () => [...unassignedGuests, ...group.guests],
    [unassignedGuests, group.guests],
  );
  const outList = pool.filter((g) => !draft.has(g.id));
  const inList = pool.filter((g) => draft.has(g.id));
  const { added, removed, dirty } = changes;

  const move = (ids: string[], into: boolean) =>
    onDraftChange(into ? new Set([...draft, ...ids]) : withoutIds(draft, ids));

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
        <Button variant="outline" onClick={onEdit} className="h-9 font-semibold">
          <IconUserEdit size={16} />
          {t('mobile.menuEdit')}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <AssignColumn
          side="out"
          guests={outList}
          saved={saved}
          onMove={(ids) => move(ids, true)}
        />
        <AssignColumn
          side="in"
          guests={inList}
          saved={saved}
          onMove={(ids) => move(ids, false)}
        />
      </div>

      <div className="flex items-center gap-2.5 border-t px-[18px] py-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <span className="text-[15px] font-extrabold whitespace-nowrap">
            {t('mobile.inGroupCount', { count: inList.length })}
          </span>
          <span
            className={cn(
              'truncate text-[13px]',
              dirty
                ? rsvpPresentation('pending').text
                : 'text-muted-foreground',
            )}
          >
            {dirty
              ? t('mobile.changesSummary', { added, removed })
              : t('mobile.ofTotalRecords', { count: totalRecords })}
          </span>
        </div>
        <Button
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => onDraftChange(new Set(saved))}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={onSave}
          className="px-[22px] font-bold"
        >
          {t('mobile.saveButton')}
        </Button>
      </div>
    </>
  );
}

function AssignColumn({
  side,
  guests,
  saved,
  onMove,
}: {
  side: 'out' | 'in';
  guests: GuestApp[];
  saved: ReadonlySet<string>;
  onMove: (ids: string[]) => void;
}) {
  const t = useTranslations('guests');
  const isOut = side === 'out';
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const visible = q
    ? guests.filter((g) => g.name.toLowerCase().includes(q))
    : guests;
  const visibleIds = visible.map((g) => g.id);
  // Only what is still in this column counts - a checked row that moved out
  // by its own +/− is no longer here to act on.
  const picked = guests.filter((g) => checked.has(g.id)).map((g) => g.id);
  const allState = headerState(checked, visibleIds);
  const pickedVisible = visibleIds.filter((id) => checked.has(id)).length;

  const moveOne = (id: string) => {
    onMove([id]);
    setChecked((prev) => withoutIds(prev, [id]));
  };

  const moveChecked = () => {
    onMove(picked);
    setChecked(new Set());
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        !isOut && 'border-s',
      )}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-2.5">
        <div className="flex h-8 items-center justify-between gap-2.5">
          <span className="flex items-baseline gap-[7px]">
            <span className="text-[15px] font-extrabold">
              {isOut ? t('groups.mobile.outTab') : t('groups.mobile.inTab')}
            </span>
            <span className="text-primary text-sm font-bold tabular-nums">
              {guests.length}
            </span>
          </span>
          {picked.length > 0 && (
            <Button
              size="sm"
              variant={isOut ? 'default' : 'secondary'}
              onClick={moveChecked}
              className="h-8 rounded-[9px] font-bold"
            >
              {isOut ? (
                <IconPlus size={15} stroke={2.4} />
              ) : (
                <IconMinus size={15} stroke={2.4} />
              )}
              {isOut
                ? t('groups.mobile.addSelected', { count: picked.length })
                : t('groups.desktop.removeChecked', { count: picked.length })}
            </Button>
          )}
        </div>

        <div className="bg-card flex h-9 items-center gap-[7px] rounded-[10px] border px-[11px]">
          <IconSearch size={15} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isOut
                ? t('groups.mobile.searchAvailablePlaceholder')
                : t('groups.mobile.searchInGroupPlaceholder')
            }
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </div>

        {visible.length > 0 && (
          <div
            onClick={() =>
              setChecked((prev) => toggleAllVisible(prev, visibleIds))
            }
            className="text-muted-foreground flex h-7 cursor-pointer items-center gap-2.5 px-2.5 text-[12.5px]"
          >
            <SelectBox
              state={allState}
              label={t('groups.mobile.selectAllCount', {
                count: visible.length,
              })}
              onClick={() =>
                setChecked((prev) => toggleAllVisible(prev, visibleIds))
              }
              className="size-[18px] shrink-0"
            />
            <span>
              {pickedVisible > 0
                ? t('groups.mobile.selectedCount', { count: pickedVisible })
                : t('groups.mobile.selectAllCount', { count: visible.length })}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3">
        {visible.map((guest) => {
          const on = checked.has(guest.id);
          const wasMember = saved.has(guest.id);
          return (
            <div
              key={guest.id}
              onClick={() => setChecked((prev) => toggleOne(prev, guest.id))}
              className={cn(
                'flex h-[52px] shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] ps-1.5 pe-2.5 transition-colors',
                on ? 'bg-primary/8' : 'hover:bg-muted',
              )}
            >
              <SelectBox
                state={on ? 'all' : 'none'}
                label={guest.name}
                onClick={() =>
                  setChecked((prev) => toggleOne(prev, guest.id))
                }
                className="size-[18px] shrink-0"
              />
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-[13.5px] font-bold',
                  avatarTintFor(guest.name),
                )}
              >
                {guest.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {guest.name}
                </span>
                {isOut && wasMember && (
                  <span
                    className={cn(
                      rsvpPresentation('pending').chip,
                      'inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[11px] font-semibold',
                    )}
                  >
                    {t('groups.desktop.removedOnSave')}
                  </span>
                )}
                {!isOut && !wasMember && (
                  <span
                    className={cn(
                      rsvpPresentation('confirmed').chip,
                      'inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[11px] font-semibold',
                    )}
                  >
                    {t('groups.mobile.addedBadge')}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 text-[12.5px] whitespace-nowrap">
                {t('mobile.seats', { count: guest.amount })}
              </span>
              <button
                type="button"
                aria-label={
                  isOut
                    ? t('groups.desktop.addOne', { name: guest.name })
                    : t('groups.desktop.removeOne', { name: guest.name })
                }
                onClick={(e) => {
                  e.stopPropagation();
                  moveOne(guest.id);
                }}
                className={cn(
                  'flex size-[30px] shrink-0 items-center justify-center rounded-lg',
                  isOut
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                {isOut ? (
                  <IconPlus size={16} stroke={2.4} />
                ) : (
                  <IconMinus size={16} stroke={2.4} />
                )}
              </button>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
            <span className="text-[15px] font-bold">
              {q
                ? t('groups.mobile.noResults')
                : isOut
                  ? t('groups.mobile.noAvailableGuests')
                  : t('groups.mobile.emptyGroupTitle')}
            </span>
            <span className="text-muted-foreground text-[13px]">
              {q
                ? t('groups.mobile.tryAnotherName')
                : isOut
                  ? t('groups.mobile.allGuestsAssigned')
                  : t('groups.desktop.emptyGroupHint')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
