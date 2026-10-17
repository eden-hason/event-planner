'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconListCheck, IconSearch, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { GuestApp, GroupSide } from '@/features/guests/schemas';
import { useGroupWrites } from '@/features/guests/hooks/use-group-writes';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import { SideBadge } from '../../side-badge';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  draftChanges,
  matchesNameOrPhone,
  membershipStanding,
} from '@/features/guests/utils/group-assignment';
import {
  headerState,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { AssignRow } from './assign-row';
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
      setDraft(new Set(group.guests.map((g) => g.id)));
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

  /**
   * The group's members as saved - what the tabs list. Read from the live
   * group, so a save's marks clear as soon as the refreshed group arrives.
   */
  const base = useMemo(() => new Set(group?.guests.map((g) => g.id)), [group]);

  // The only guests that can ever be a member of this group: currently
  // unassigned, or already in it. Guests belonging to another group aren't
  // reassignable from here, matching the desktop drawer.
  const pool = useMemo(
    () => [...availableGuests, ...(group?.guests ?? [])],
    [availableGuests, group],
  );
  // Formatting parses each number, so it runs once per record, not per render.
  const phones = useMemo(
    () => new Map(pool.map((g) => [g.id, formatPhone(g.phone)])),
    [pool],
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
  const standingOf = (id: string) => membershipStanding(id, base, draft);

  const updateDraft = useCallback(
    (update: (prev: Set<string>) => Set<string>) => {
      setDraft(update);
      setLastSave(null);
    },
    [],
  );

  const toggleMove = useCallback(
    (id: string) =>
      updateDraft((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [updateDraft],
  );

  const toggleSelect = useCallback(
    (id: string) => setSelected((prev) => toggleOne(prev, id)),
    [],
  );

  const visibleIds = visible.map((g) => g.id);
  const allVisibleSelected = headerState(selected, visibleIds) === 'all';
  // Only what is still listed counts - a search can hide a ticked row.
  const picked = visibleIds.filter((id) => selected.has(id));

  const handleApplyBulk = () => {
    if (picked.length === 0) return;
    updateDraft((prev) => {
      const next = new Set(prev);
      picked.forEach((id) => (isOut ? next.add(id) : next.delete(id)));
      return next;
    });
    setSelected(new Set());
  };

  useEffect(() => {
    if (!open || editingId) return;
    const onKey = (e: KeyboardEvent) =>
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
    const moved = pool.filter((g) => draft.has(g.id) !== base.has(g.id));

    setSaving(true);
    const ok = await groupWrites.saveMembers(group, [...draft], [...base]);
    setSaving(false);
    // A failed save keeps every mark, so it can be tried again.
    if (!ok) return;

    setFlash(new Set(moved.map((g) => g.id)));
    setLastSave({ added, removed });
  };

  const editing = editingId
    ? (pool.find((g) => g.id === editingId) ?? null)
    : null;

  if (!rendered) return null;

  const inNow = base.size;
  const inTo = draft.size;
  const footer = dirty
    ? {
        tone: cn(rsvpPresentation('pending').text, 'font-semibold'),
        parts: [
          added > 0 && t('groups.assignScreen.joinPending', { count: added }),
          removed > 0 &&
            t('groups.assignScreen.leavePending', { count: removed }),
          t('groups.assignScreen.unsaved'),
        ],
      }
    : lastSave
      ? {
          tone: cn(rsvpPresentation('confirmed').text, 'font-semibold'),
          parts: [
            t('groups.assignScreen.saved'),
            lastSave.added > 0 &&
              t('groups.assignScreen.joinDone', { count: lastSave.added }),
            lastSave.removed > 0 &&
              t('groups.assignScreen.leaveDone', { count: lastSave.removed }),
          ],
        }
      : {
          tone: 'text-muted-foreground',
          parts: [t('groups.mobile.ofTotalRecords', { count: totalRecords })],
        };
  const empty = query.trim()
    ? 'noMatches'
    : isOut
      ? 'allAssigned'
      : 'emptyGroup';

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
            {t('groups.mobile.selectedCount', { count: picked.length })}
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
            phone={phones.get(g.id) ?? ''}
            standing={standingOf(g.id)}
            flashed={flash.has(g.id)}
            selectMode={selectMode}
            checked={selected.has(g.id)}
            disabled={saving}
            onToggleSelect={toggleSelect}
            onToggleMove={toggleMove}
            onEdit={setEditingId}
          />
        ))}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-[14px]">
              <IconSearch size={22} />
            </div>
            <span className="text-[17px] font-bold">
              {t(`groups.assignScreen.${empty}Title`)}
            </span>
            <span className="text-muted-foreground text-[13.5px]">
              {t(`groups.assignScreen.${empty}Hint`)}
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
          <span className={cn('truncate text-xs', footer.tone)}>
            {footer.parts.filter(Boolean).join(' · ')}
          </span>
        </div>
        {selectMode ? (
          <Button
            onClick={handleApplyBulk}
            disabled={picked.length === 0 || saving}
            className="h-12 shrink-0 rounded-xl px-[18px] text-[15px] font-bold"
          >
            {isOut
              ? t('groups.assignScreen.bulkAdd', { count: picked.length })
              : t('groups.assignScreen.bulkRemove', { count: picked.length })}
          </Button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => updateDraft(() => new Set(base))}
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
        standing={editing ? standingOf(editing.id) : 'out'}
        pendingMoves={added + removed}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingId(null);
        }}
      />
    </div>
  );
}
