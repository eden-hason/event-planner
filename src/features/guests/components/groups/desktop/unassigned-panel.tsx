'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconChevronDown,
  IconFolder,
  IconPencil,
  IconSearch,
} from '@tabler/icons-react';
import { GuestApp, GroupWithGuestsApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { matchesNameOrPhone } from '@/features/guests/utils/group-assignment';
import {
  headerState,
  toggleAllVisible,
  toggleOne,
  withoutIds,
} from '@/features/guests/utils/guest-selection';
import { avatarTintFor } from '@/lib/avatar-tint';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { SelectBox } from '../../desktop/select-box';
import {
  BarButton,
  BarDivider,
  SELECTION_BAR_CLASS,
} from '../../desktop/bulk-action-bar';
import { EditGuestSheet } from '../edit-guest-sheet';
import { GroupPicker } from './group-picker';

/**
 * The "no group" records as a list: assign one from its row's popover, or tick
 * several and assign them together from the floating bar. Assigning is
 * immediate here - there is no Save - and a row's pencil edits its details.
 */
export function UnassignedPanel({
  eventId,
  guests,
  groups,
  onAssign,
  onNewGroup,
}: {
  eventId: string;
  guests: GuestApp[];
  groups: GroupWithGuestsApp[];
  onAssign: (guests: GuestApp[], group: GroupWithGuestsApp) => void;
  /** "New group" from a picker: create it with these records already in it. */
  onNewGroup: (guests: GuestApp[]) => void;
}) {
  const t = useTranslations('guests');
  const pending = rsvpPresentation('pending');
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [popFor, setPopFor] = useState<string | null>(null);
  const [barPickerOpen, setBarPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editLabel = t('groups.editGuest.dialogLabel');

  // Formatting parses each number, so it runs once per list, not on every
  // tick and keystroke.
  const phones = useMemo(
    () => new Map(guests.map((g) => [g.id, formatPhone(g.phone)])),
    [guests],
  );

  const q = query.trim();
  const visible = useMemo(
    () => guests.filter((g) => matchesNameOrPhone(g, query)),
    [guests, query],
  );
  const visibleIds = visible.map((g) => g.id);
  const picked = guests.filter((g) => checked.has(g.id));
  const pickedVisible = visibleIds.filter((id) => checked.has(id)).length;

  const assign = (targets: GuestApp[], group: GroupWithGuestsApp) => {
    setPopFor(null);
    setBarPickerOpen(false);
    setChecked((prev) => withoutIds(prev, targets.map((g) => g.id)));
    onAssign(targets, group);
  };

  const newGroup = (targets: GuestApp[]) => {
    setPopFor(null);
    setBarPickerOpen(false);
    onNewGroup(targets);
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-[18px] py-4">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            pending.chip,
          )}
        >
          <IconFolder size={21} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[19px] leading-tight font-extrabold">
            {t('groups.mobile.chipNone')}
          </h2>
          <span className="text-muted-foreground truncate text-[13px]">
            {t('groups.desktop.unassignedSub', { count: guests.length })}
          </span>
        </div>
        <div className="bg-card flex h-9 w-[260px] items-center gap-[7px] rounded-[10px] border px-[11px]">
          <IconSearch size={15} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('groups.desktop.searchNameOrPhone')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </div>
      </div>

      {visible.length > 0 && (
        <div
          onClick={() => setChecked((prev) => toggleAllVisible(prev, visibleIds))}
          className="text-muted-foreground flex h-10 shrink-0 cursor-pointer items-center gap-2.5 border-b px-6 text-[12.5px]"
        >
          <SelectBox
            state={headerState(checked, visibleIds)}
            label={t('groups.mobile.selectAllCount', { count: visible.length })}
            onClick={() =>
              setChecked((prev) => toggleAllVisible(prev, visibleIds))
            }
            className="size-[18px] shrink-0"
          />
          <span className="w-8 shrink-0" />
          <span className="flex-1">
            {pickedVisible > 0
              ? t('groups.mobile.selectedCount', { count: pickedVisible })
              : t('groups.desktop.nameSelectAll', { count: visible.length })}
          </span>
          <span className="w-[150px]">{t('groups.desktop.colPhone')}</span>
          <span className="w-[90px]">{t('groups.desktop.colSeats')}</span>
          <span className="w-[30px]" />
          <span className="w-[92px]" />
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pt-1',
          picked.length > 0 ? 'pb-24' : 'pb-3',
        )}
      >
        {visible.map((guest) => {
          const on = checked.has(guest.id);
          const popOpen = popFor === guest.id;
          const phone = phones.get(guest.id);
          const trigger = (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!popOpen) setPopFor(guest.id);
              }}
              className={cn(
                'text-primary flex h-8 w-[92px] shrink-0 items-center justify-center gap-[5px] rounded-[9px] text-[13px] font-bold',
                popOpen ? 'bg-primary/15' : 'bg-primary/10 hover:bg-primary/15',
              )}
            >
              <IconFolder size={14} stroke={2.2} />
              {t('groups.mobile.assignButton')}
              <IconChevronDown size={12} stroke={2.4} />
            </button>
          );
          return (
            <div
              key={guest.id}
              onClick={() => setChecked((prev) => toggleOne(prev, guest.id))}
              className={cn(
                'flex h-[54px] shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 transition-colors',
                on ? 'bg-primary/8' : popOpen ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              <SelectBox
                state={on ? 'all' : 'none'}
                label={guest.name}
                onClick={() => setChecked((prev) => toggleOne(prev, guest.id))}
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
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {guest.name}
              </span>
              <span
                dir="ltr"
                className={cn(
                  'w-[150px] shrink-0 text-start text-[13px] whitespace-nowrap rtl:text-end',
                  phone
                    ? 'text-muted-foreground tabular-nums'
                    : cn(pending.text, 'font-semibold'),
                )}
              >
                {phone || t('groups.assignScreen.noPhone')}
              </span>
              <span className="text-muted-foreground w-[90px] shrink-0 text-[13px]">
                {guest.amount}
              </span>
              <button
                type="button"
                aria-label={t('groups.assignScreen.edit', { name: guest.name })}
                title={editLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(guest.id);
                }}
                className="text-muted-foreground hover:bg-background flex size-[30px] shrink-0 items-center justify-center rounded-lg"
              >
                <IconPencil size={16} />
              </button>
              {/* One popover at a time, so only the open row mounts one. */}
              {popOpen ? (
                <GroupPicker
                  title={t('groups.mobile.pickGroupTitle', { name: guest.name })}
                  groups={groups}
                  open
                  onOpenChange={(open) => !open && setPopFor(null)}
                  onPick={(group) => assign([guest], group)}
                  onNewGroup={() => newGroup([guest])}
                >
                  {trigger}
                </GroupPicker>
              ) : (
                trigger
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-5 py-12 text-center">
            <span className="text-[15px] font-bold">
              {q
                ? t('groups.mobile.noResults')
                : t('groups.mobile.noAvailableGuests')}
            </span>
            <span className="text-muted-foreground text-[13px]">
              {q
                ? t('groups.mobile.tryAnotherName')
                : t('groups.mobile.allGuestsAssigned')}
            </span>
          </div>
        )}
      </div>

      {picked.length > 0 && (
        <div
          role="toolbar"
          aria-label={t('groups.mobile.selectedCount', { count: picked.length })}
          className={cn(
            SELECTION_BAR_CLASS,
            'absolute inset-x-0 bottom-[18px] z-10 mx-auto w-fit ps-4',
          )}
        >
          <span className="text-sm font-bold tabular-nums">
            {t('groups.mobile.selectedCount', { count: picked.length })}
          </span>
          <BarDivider />
          <GroupPicker
            title={t('groups.desktop.pickGroupTitleMany', {
              count: picked.length,
            })}
            groups={groups}
            open={barPickerOpen}
            onOpenChange={setBarPickerOpen}
            onPick={(group) => assign(picked, group)}
            onNewGroup={() => newGroup(picked)}
            align="center"
          >
            <BarButton>
              <IconFolder size={15} stroke={2.2} />
              {t('groups.desktop.assignToGroup')}
              <IconChevronDown size={12} stroke={2.4} />
            </BarButton>
          </GroupPicker>
          <BarButton
            onClick={() => setChecked(new Set())}
            className="text-background/70 hover:text-background"
          >
            {t('groups.desktop.clear')}
          </BarButton>
        </div>
      )}

      <EditGuestSheet
        variant="desktop"
        guest={guests.find((g) => g.id === editingId) ?? null}
        eventId={eventId}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      />
    </>
  );
}
