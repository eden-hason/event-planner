'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconListCheck,
  IconMinus,
  IconPencil,
  IconPlus,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { GuestApp, GroupSide } from '@/features/guests/schemas';
import { useGroupWrites } from '@/features/guests/hooks/use-group-writes';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import { SideBadge } from '../../side-badge';
import { avatarTintFor } from '@/lib/avatar-tint';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  draftChanges,
  matchesNameOrPhone,
} from '@/features/guests/utils/group-assignment';
import {
  headerState,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { EditGuestSheet } from './edit-guest-sheet';

/**
 * Just enough of a group to drive the sheet - a freshly created group (from
 * the "create & assign" flow) has no guests yet and hasn't round-tripped
 * through the revalidated groups list, so this stays narrower than
 * `GroupWithGuestsApp` on purpose. Any real group satisfies it too.
 */
export interface AssignTarget {
  id: string;
  name: string;
  side?: GroupSide | null;
  guests: GuestApp[];
}

interface AssignGuestsScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AssignTarget | null;
  /** Guests with no group at all - the same pool the desktop drawer uses. */
  availableGuests: GuestApp[];
  /** Every guest record in the event, for the footer's "of N". */
  totalRecords: number;
  eventId: string;
}

type Tab = 'out' | 'in';

/** How long a just-saved row stays highlighted in its new tab. */
const FLASH_MS = 2200;

/**
 * Assigning records to one group, on a phone. The tabs list the group as
 * saved: + / − only marks a row as pending to move, and the row stays where it
 * is - tinted, labelled, its button turned into an undo - until Save. Save
 * keeps the screen open, moves the rows, and highlights them for a moment in
 * the tab they moved to. Any row's pencil edits the record's details on top,
 * without touching the draft.
 */
export function AssignGuestsScreen({
  open,
  onOpenChange,
  group,
  availableGuests,
  totalRecords,
  eventId,
}: AssignGuestsScreenProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const groupWrites = useGroupWrites(eventId);

  const [tab, setTab] = useState<Tab>('out');
  const [query, setQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** The group's members as saved - what the tabs list. */
  const [base, setBase] = useState<Set<string>>(new Set());
  /** The members Save would leave the group with. */
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  /** Rows the last save moved, highlighted for a moment. */
  const [flash, setFlash] = useState<ReadonlySet<string>>(new Set());
  /** What the last save did, until the draft changes again. */
  const [lastSave, setLastSave] = useState<{
    added: number;
    removed: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && group) {
      const memberIds = new Set(group.guests.map((g) => g.id));
      setBase(memberIds);
      setDraft(memberIds);
      setSelected(new Set());
      setSelectMode(false);
      setTab('out');
      setQuery('');
      setFlash(new Set());
      setLastSave(null);
      setEditingId(null);
    }
    // Only re-seed when the sheet opens for a (possibly new) group - not when
    // the revalidated group arrives after a save or an edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);

  useEffect(() => {
    if (flash.size === 0) return;
    const timer = setTimeout(() => setFlash(new Set()), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  // The only guests that can ever be a member of this group: currently
  // unassigned, or already in it. Guests belonging to another group aren't
  // reassignable from here, matching the desktop drawer.
  const pool = useMemo(
    () => [...availableGuests, ...(group?.guests ?? [])],
    [availableGuests, group],
  );

  const outList = useMemo(
    () => pool.filter((g) => !base.has(g.id)),
    [pool, base],
  );
  const inList = useMemo(
    () => pool.filter((g) => base.has(g.id)),
    [pool, base],
  );

  const isOut = tab === 'out';
  const visible = useMemo(
    () =>
      (isOut ? outList : inList).filter((g) => matchesNameOrPhone(g, query)),
    [isOut, outList, inList, query],
  );

  const { added, removed, dirty } = draftChanges(base, draft);
  const isPending = (id: string) => draft.has(id) !== base.has(id);

  const updateDraft = (next: Set<string>) => {
    setDraft(next);
    setLastSave(null);
  };

  const toggleMove = (guestId: string) => {
    const next = new Set(draft);
    if (next.has(guestId)) next.delete(guestId);
    else next.add(guestId);
    updateDraft(next);
  };

  const visibleIds = visible.map((g) => g.id);
  const allVisibleSelected = headerState(selected, visibleIds) === 'all';
  // Only what is still listed counts - a search can hide a ticked row.
  const pickedCount = visibleIds.filter((id) => selected.has(id)).length;

  const handleApplyBulk = () => {
    const picked = visibleIds.filter((id) => selected.has(id));
    if (picked.length === 0) return;
    const next = new Set(draft);
    if (isOut) picked.forEach((id) => next.add(id));
    else picked.forEach((id) => next.delete(id));
    updateDraft(next);
    setSelected(new Set());
  };

  useEffect(() => {
    if (!open || editingId) return;
    const onKey = (e: globalThis.KeyboardEvent) =>
      e.key === 'Escape' && onOpenChange(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editingId, onOpenChange]);

  // Stay mounted through the exit animation, then unmount. The timeout covers
  // reduced-motion, where `animationend` never fires.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => setRendered(false), 300);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  const handleSave = async () => {
    if (!group || !dirty || saving) return;
    const next = new Set(draft);
    const moved = pool.filter((g) => isPending(g.id)).map((g) => g.id);
    const summary = { added, removed };

    setSaving(true);
    const ok = await groupWrites.saveMembers(group, [...next], [...base]);
    setSaving(false);
    // A failed save keeps every mark, so it can be tried again.
    if (!ok) return;

    setBase(next);
    setFlash(new Set(moved));
    setLastSave(summary);
  };

  const editing = editingId
    ? (pool.find((g) => g.id === editingId) ?? null)
    : null;

  if (!rendered) return null;

  const inNow = inList.length;
  const inTo = draft.size;
  const footerSub = dirty
    ? [
        added > 0 && t('groups.assignScreen.joinPending', { count: added }),
        removed > 0 &&
          t('groups.assignScreen.leavePending', { count: removed }),
        t('groups.assignScreen.unsaved'),
      ]
    : lastSave
      ? [
          t('groups.assignScreen.saved'),
          lastSave.added > 0 &&
            t('groups.assignScreen.joinDone', { count: lastSave.added }),
          lastSave.removed > 0 &&
            t('groups.assignScreen.leaveDone', { count: lastSave.removed }),
        ]
      : [t('groups.mobile.ofTotalRecords', { count: totalRecords })];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-guests-title"
      onAnimationEnd={() => {
        if (!open) setRendered(false);
      }}
      className={cn(
        'bg-background fill-mode-forwards fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top)] duration-200',
        open
          ? 'animate-in fade-in slide-in-from-end-4'
          : 'animate-out fade-out slide-out-to-end-4',
      )}
    >
      <header className="bg-card flex flex-col gap-2.5 border-b px-4 pt-1 pb-3">
        <div className="flex min-h-12 items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            aria-label={tCommon('close')}
          >
            <IconX size={16} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-muted-foreground text-xs">
              {t('groups.mobile.eyebrowAssign')}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              <h2
                id="assign-guests-title"
                className="truncate text-[18px] leading-tight font-extrabold"
              >
                {group?.name ?? ''}
              </h2>
              <SideBadge side={group?.side} />
            </div>
          </div>
          <button
            type="button"
            className={cn(
              'flex h-9 shrink-0 items-center gap-[5px] rounded-[10px] border px-[11px] text-sm font-semibold',
              selectMode
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-card text-foreground',
            )}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
          >
            <IconListCheck size={16} />
            {selectMode
              ? t('groups.mobile.doneSelecting')
              : t('groups.mobile.selectMode')}
          </button>
        </div>

        {/* Out / In, as saved - a pending move stays in the tab it is in */}
        <div className="bg-muted flex h-[42px] gap-0.5 rounded-[11px] p-[3px]">
          {(
            [
              ['out', t('groups.mobile.outTab'), outList.length],
              ['in', t('groups.mobile.inTab'), inList.length],
            ] as const
          ).map(([key, label, count]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSelected(new Set());
                }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors',
                  active
                    ? 'bg-card text-foreground font-bold shadow-sm'
                    : 'text-muted-foreground font-medium',
                )}
              >
                {label}
                <span
                  className={cn(
                    'font-bold tabular-nums',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-card flex h-10 items-center gap-[7px] rounded-[11px] border px-[11px]">
          <IconSearch size={16} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('groups.assignScreen.searchPlaceholder')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </header>

      <Reveal open={selectMode}>
        <div className="text-muted-foreground flex min-h-[42px] items-center justify-end gap-2.5 px-4 pt-2.5 text-[12.5px]">
          <span>
            {t('groups.mobile.selectedCount', { count: pickedCount })}
          </span>
          <button
            type="button"
            onClick={() =>
              setSelected((prev) => toggleAllVisible(prev, visibleIds))
            }
            className="text-primary text-[13.5px] font-bold"
          >
            {allVisibleSelected
              ? t('groups.mobile.clearSelection')
              : t('groups.mobile.selectAllCount', { count: visible.length })}
          </button>
        </div>
      </Reveal>

      <div className="flex flex-1 flex-col gap-[7px] overflow-y-auto px-4 pt-2.5 pb-4">
        {visible.map((g) => (
          <AssignRow
            key={g.id}
            guest={g}
            isOut={isOut}
            pending={isPending(g.id)}
            flashed={flash.has(g.id) && !isPending(g.id)}
            selectMode={selectMode}
            checked={selected.has(g.id)}
            disabled={saving}
            onToggleSelect={() => setSelected((prev) => toggleOne(prev, g.id))}
            onToggleMove={() => toggleMove(g.id)}
            onEdit={() => setEditingId(g.id)}
          />
        ))}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-[14px]">
              <IconSearch size={22} />
            </div>
            <span className="text-[17px] font-bold">
              {query.trim()
                ? t('groups.assignScreen.noMatchesTitle')
                : isOut
                  ? t('groups.assignScreen.allAssignedTitle')
                  : t('groups.assignScreen.emptyGroupTitle')}
            </span>
            <span className="text-muted-foreground text-[13.5px]">
              {query.trim()
                ? t('groups.assignScreen.noMatchesHint')
                : isOut
                  ? t('groups.assignScreen.allAssignedHint')
                  : t('groups.assignScreen.emptyGroupHint')}
            </span>
          </div>
        )}
      </div>

      <footer className="bg-card flex items-center gap-2 border-t px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-extrabold tabular-nums">
            {inTo !== inNow
              ? t('groups.assignScreen.inGroupProjected', {
                  from: inNow,
                  to: inTo,
                })
              : t('groups.assignScreen.inGroup', { count: inNow })}
          </span>
          <span
            className={cn(
              'truncate text-xs',
              dirty
                ? cn(rsvpPresentation('pending').text, 'font-semibold')
                : lastSave
                  ? cn(rsvpPresentation('confirmed').text, 'font-semibold')
                  : 'text-muted-foreground',
            )}
          >
            {footerSub.filter(Boolean).join(' · ')}
          </span>
        </div>
        {selectMode ? (
          <Button
            onClick={handleApplyBulk}
            disabled={pickedCount === 0 || saving}
            className="h-12 shrink-0 rounded-xl px-[18px] text-[15px] font-bold"
          >
            {isOut
              ? t('groups.assignScreen.bulkAdd', { count: pickedCount })
              : t('groups.assignScreen.bulkRemove', { count: pickedCount })}
          </Button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => updateDraft(new Set(base))}
              className="h-12 rounded-xl px-4 text-[15px]"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!dirty || saving}
              className="h-12 rounded-xl px-[22px] text-[15px] font-bold"
            >
              {t('groups.mobile.saveButton')}
            </Button>
          </div>
        )}
      </footer>

      <EditGuestSheet
        guest={editing}
        eventId={eventId}
        groupName={group?.name ?? ''}
        inGroup={editing ? base.has(editing.id) : false}
        pending={editing ? isPending(editing.id) : false}
        draftChanges={added + removed}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingId(null);
        }}
      />
    </div>
  );
}

/**
 * One record in the assign screen. Pending rows keep their place: a join is
 * tinted green, a leave amber with the name dimmed, and the + / − becomes an
 * undo. The label carries the meaning too, so it never rests on colour alone.
 */
function AssignRow({
  guest,
  isOut,
  pending,
  flashed,
  selectMode,
  checked,
  disabled,
  onToggleSelect,
  onToggleMove,
  onEdit,
}: {
  guest: GuestApp;
  isOut: boolean;
  pending: boolean;
  flashed: boolean;
  selectMode: boolean;
  checked: boolean;
  disabled: boolean;
  onToggleSelect: () => void;
  onToggleMove: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations('guests');
  const joining = pending && isOut;
  const leaving = pending && !isOut;
  const on = selectMode && checked;
  const phone = formatPhone(guest.phone);

  const label = joining
    ? t('groups.assignScreen.willJoin')
    : leaving
      ? t('groups.assignScreen.willLeave')
      : flashed
        ? isOut
          ? t('groups.assignScreen.justLeft')
          : t('groups.assignScreen.justJoined')
        : null;
  const LabelIcon = joining
    ? IconArrowLeft
    : leaving
      ? IconArrowRight
      : IconCheck;

  // Only the surface is tinted - the text keeps its own colours.
  const tint =
    joining || (flashed && !isOut)
      ? 'bg-rsvp-confirmed-tint'
      : leaving || (flashed && isOut)
        ? 'bg-rsvp-pending-tint'
        : null;

  return (
    <div
      role={selectMode ? 'checkbox' : undefined}
      aria-checked={selectMode ? checked : undefined}
      aria-label={label ? `${guest.name}, ${label}` : guest.name}
      tabIndex={selectMode ? 0 : undefined}
      onClick={selectMode ? onToggleSelect : undefined}
      onKeyDown={
        selectMode
          ? (e: KeyboardEvent) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onToggleSelect();
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-[62px] shrink-0 items-center gap-[9px] rounded-[14px] border px-2.5 py-[9px] transition-[background-color,box-shadow] duration-700',
        tint ?? (on ? 'bg-primary/8' : 'bg-card'),
        tint && !on && 'border-transparent',
        on && 'border-primary ring-primary ring-1',
        selectMode && 'cursor-pointer',
      )}
    >
      {selectMode && (
        <span
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]',
            checked
              ? 'border-primary bg-primary text-white'
              : 'border-muted-foreground/30 bg-card',
          )}
        >
          {checked && <IconCheck size={15} stroke={3} />}
        </span>
      )}
      <span
        className={cn(
          'flex size-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold',
          avatarTintFor(guest.name),
          leaving && 'opacity-60',
        )}
      >
        {guest.name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'min-w-0 truncate text-[15px] font-semibold',
              leaving ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {guest.name}
          </span>
          {label && (
            <span
              className={cn(
                'flex shrink-0 items-center gap-[3px] text-[11.5px] font-bold whitespace-nowrap',
                rsvpPresentation(
                  joining || (flashed && !isOut) ? 'confirmed' : 'pending',
                ).text,
              )}
            >
              <LabelIcon
                size={13}
                stroke={2.4}
                // The arrow points at the tab the record moves to.
                className={cn(pending && 'ltr:-scale-x-100')}
              />
              {label}
            </span>
          )}
        </div>
        {phone ? (
          <span
            dir="ltr"
            className="text-muted-foreground self-start text-[12.5px] whitespace-nowrap tabular-nums"
          >
            {phone}
          </span>
        ) : (
          <span
            className={cn(
              rsvpPresentation('pending').text,
              'self-start text-[12.5px] font-semibold whitespace-nowrap',
            )}
          >
            {t('groups.assignScreen.noPhone')}
          </span>
        )}
      </div>
      <span className="flex min-w-[30px] shrink-0 flex-col items-center">
        <b className="text-[15px] leading-tight font-bold tabular-nums">
          {guest.amount}
        </b>
        <span className="text-muted-foreground text-[10.5px]">
          {t('groups.assignScreen.seats')}
        </span>
      </span>
      <button
        type="button"
        aria-label={t('groups.assignScreen.edit', { name: guest.name })}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="text-muted-foreground hover:bg-muted flex size-[34px] shrink-0 items-center justify-center rounded-[10px]"
      >
        <IconPencil size={17} />
      </button>
      {!selectMode && (
        <button
          type="button"
          disabled={disabled}
          aria-label={
            pending
              ? t('groups.assignScreen.undoMove', { name: guest.name })
              : isOut
                ? t('groups.desktop.addOne', { name: guest.name })
                : t('groups.desktop.removeOne', { name: guest.name })
          }
          onClick={onToggleMove}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-[10px] border disabled:opacity-50',
            pending
              ? 'bg-card text-foreground'
              : isOut
                ? 'bg-primary/10 text-primary border-transparent'
                : 'bg-muted text-muted-foreground border-transparent',
          )}
        >
          {pending ? (
            <IconArrowBackUp size={18} stroke={2.3} />
          ) : isOut ? (
            <IconPlus size={18} stroke={2.3} />
          ) : (
            <IconMinus size={18} stroke={2.3} />
          )}
        </button>
      )}
    </div>
  );
}
