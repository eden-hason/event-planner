'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  IconCheck,
  IconListCheck,
  IconMinus,
  IconPlus,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { GuestApp, GroupSide } from '@/features/guests/schemas';
import { updateGroupMembers } from '@/features/guests/actions/groups';
import { cn } from '@/lib/utils';
import { SideBadge } from '../../side-badge';
import { avatarTintFor } from '@/lib/avatar-tint';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  headerState,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';

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

  const [tab, setTab] = useState<Tab>('out');
  const [qOut, setQOut] = useState('');
  const [qIn, setQIn] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draftIn, setDraftIn] = useState<Set<string>>(new Set());
  const [originalMemberIds, setOriginalMemberIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (open && group) {
      const memberIds = new Set(group.guests.map((g) => g.id));
      setDraftIn(memberIds);
      setOriginalMemberIds(memberIds);
      setSelected(new Set());
      setSelectMode(false);
      setTab('out');
      setQOut('');
      setQIn('');
    }
    // Only re-seed when the sheet opens for a (possibly new) group - not on
    // every keystroke inside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);

  // The only guests that can ever be a member of this group: currently
  // unassigned, or already in it. Guests belonging to another group aren't
  // reassignable from here, matching the desktop drawer.
  const pool = useMemo(
    () => [...availableGuests, ...(group?.guests ?? [])],
    [availableGuests, group],
  );

  const outList = useMemo(
    () => pool.filter((g) => !draftIn.has(g.id)),
    [pool, draftIn],
  );
  const inList = useMemo(
    () => pool.filter((g) => draftIn.has(g.id)),
    [pool, draftIn],
  );

  const isOut = tab === 'out';
  const query = (isOut ? qOut : qIn).trim().toLowerCase();
  const visible = useMemo(() => {
    const list = isOut ? outList : inList;
    if (!query) return list;
    return list.filter((g) => g.name.toLowerCase().includes(query));
  }, [isOut, outList, inList, query]);

  const addedCount = [...draftIn].filter(
    (id) => !originalMemberIds.has(id),
  ).length;
  const removedCount = [...originalMemberIds].filter(
    (id) => !draftIn.has(id),
  ).length;
  const dirty = addedCount > 0 || removedCount > 0;

  const toggleMove = (guestId: string) => {
    setDraftIn((prev) => {
      const next = new Set(prev);
      if (isOut) next.add(guestId);
      else next.delete(guestId);
      return next;
    });
  };

  const toggleSelected = (guestId: string) =>
    setSelected((prev) => toggleOne(prev, guestId));

  const visibleIds = visible.map((g) => g.id);
  const allVisibleSelected = headerState(selected, visibleIds) === 'all';

  const handleToggleAll = () =>
    setSelected((prev) => toggleAllVisible(prev, visibleIds));

  const handleApplyBulk = () => {
    if (selected.size === 0) return;
    setDraftIn((prev) => {
      const next = new Set(prev);
      if (isOut) selected.forEach((id) => next.add(id));
      else selected.forEach((id) => next.delete(id));
      return next;
    });
    setSelected(new Set());
    setSelectMode(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && onOpenChange(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Stay mounted through the exit animation, then unmount. The timeout covers
  // reduced-motion, where `animationend` never fires.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => setRendered(false), 300);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  const handleSave = () => {
    if (!group || !dirty) return;

    onOpenChange(false);

    const memberGuestIds = [...draftIn];
    const previousMemberIds = [...originalMemberIds];

    const promise = updateGroupMembers(
      eventId,
      group.id,
      memberGuestIds,
      previousMemberIds,
    ).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('groups.assign.membersFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('groups.assign.updatingMembers', { name: group.name }),
      success: () => t('groups.assign.membersUpdated'),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.assign.membersFailed'),
    });
  };

  if (!rendered) return null;

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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            aria-label={tCommon('close')}
          >
            <IconX size={16} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-muted-foreground text-[11px]">
              {t('groups.mobile.eyebrowAssign')}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              <h2
                id="assign-guests-title"
                className="truncate text-[18px] font-extrabold"
              >
                {group?.name ?? ''}
              </h2>
              <SideBadge side={group?.side} />
            </div>
          </div>
          <button
            type="button"
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border px-[11px] text-sm font-semibold',
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

        {/* Out / In segmented control */}
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

        <div className="bg-background flex h-10 items-center gap-2 rounded-[10px] border px-3">
          <IconSearch size={15} className="text-muted-foreground shrink-0" />
          <input
            value={isOut ? qOut : qIn}
            onChange={(e) =>
              isOut ? setQOut(e.target.value) : setQIn(e.target.value)
            }
            placeholder={
              isOut
                ? t('groups.mobile.searchAvailablePlaceholder')
                : t('groups.mobile.searchInGroupPlaceholder')
            }
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </header>

      <Reveal open={selectMode}>
        <div className="text-muted-foreground flex items-center justify-between px-[18px] pt-2.5 text-[12.5px]">
          <span>
            {t('groups.mobile.selectedCount', { count: selected.size })}
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-primary text-[13.5px] font-bold"
          >
            {allVisibleSelected
              ? t('groups.mobile.clearSelection')
              : t('groups.mobile.selectAllCount', { count: visible.length })}
          </button>
        </div>
      </Reveal>

      <div className="flex flex-1 flex-col gap-[7px] overflow-y-auto px-4 pt-2.5 pb-4">
        {visible.map((g) => {
          const checked = selected.has(g.id);
          const wasMember = isOut && originalMemberIds.has(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                selectMode ? toggleSelected(g.id) : toggleMove(g.id)
              }
              className={cn(
                'flex h-16 w-full shrink-0 items-center gap-2.5 rounded-[14px] border px-2.5 text-start transition-colors',
                selectMode && checked
                  ? 'border-primary/50 bg-primary/8 border-dashed'
                  : 'bg-card',
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
                  'flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold',
                  avatarTintFor(g.name),
                )}
              >
                {g.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[15px] font-bold">{g.name}</span>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
                  <span className="whitespace-nowrap">
                    {t('mobile.seats', { count: g.amount })}
                  </span>
                  {wasMember && (
                    <span className={cn(rsvpPresentation('pending').chip, 'inline-flex h-[18px] items-center rounded-[5px] px-1.5 text-[11px] font-semibold')}>
                      {t('groups.mobile.removedInDraft')}
                    </span>
                  )}
                  {!isOut && !originalMemberIds.has(g.id) && (
                    <span className={cn(rsvpPresentation('confirmed').chip, 'inline-flex h-[18px] items-center rounded-[5px] px-1.5 text-[11px] font-semibold')}>
                      {t('groups.mobile.addedBadge')}
                    </span>
                  )}
                </div>
              </div>
              {!selectMode && (
                <span
                  className={cn(
                    'flex size-[34px] shrink-0 items-center justify-center rounded-[10px]',
                    isOut
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {isOut ? (
                    <IconPlus size={18} stroke={2.4} />
                  ) : (
                    <IconMinus size={18} stroke={2.4} />
                  )}
                </span>
              )}
            </button>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
              {query ? <IconSearch size={20} /> : <IconUsers size={20} />}
            </div>
            <span className="text-[15px] font-semibold">
              {query
                ? t('groups.mobile.noResults')
                : isOut
                  ? t('groups.mobile.noAvailableGuests')
                  : t('groups.mobile.emptyGroupTitle')}
            </span>
            <span className="text-muted-foreground text-[13px]">
              {query
                ? t('groups.mobile.tryAnotherName')
                : isOut
                  ? t('groups.mobile.allGuestsAssigned')
                  : t('groups.mobile.emptyGroupHint')}
            </span>
          </div>
        )}
      </div>

      <footer className="bg-card flex items-center justify-between gap-2 border-t px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">
            {t('groups.mobile.inGroupCount', { count: inList.length })}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {dirty
              ? t('groups.mobile.changesSummary', {
                  added: addedCount,
                  removed: removedCount,
                })
              : t('groups.mobile.ofTotalRecords', { count: totalRecords })}
          </span>
        </div>
        {selectMode ? (
          <Button
            onClick={handleApplyBulk}
            disabled={selected.size === 0}
            className="shrink-0"
          >
            {isOut
              ? t('groups.mobile.addSelected', { count: selected.size })
              : t('groups.mobile.removeSelected', { count: selected.size })}
          </Button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!dirty}>
              {t('groups.mobile.saveButton')}
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
