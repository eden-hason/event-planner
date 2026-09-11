'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconCheck, IconMinus, IconPlus, IconSearch, IconUsers, IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GuestApp } from '@/features/guests/schemas';
import { updateGroupMembers } from '@/features/guests/actions/groups';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Just enough of a group to drive the sheet - a freshly created group (from
 * the "create & assign" flow) has no guests yet and hasn't round-tripped
 * through the revalidated groups list, so this stays narrower than
 * `GroupWithGuestsApp` on purpose. Any real group satisfies it too.
 */
export interface AssignTarget {
  id: string;
  name: string;
  guests: GuestApp[];
}

interface AssignGuestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AssignTarget | null;
  /** Guests with no group at all - the same pool the desktop drawer uses. */
  availableGuests: GuestApp[];
  eventId: string;
}

type Tab = 'out' | 'in';

export function AssignGuestsSheet({
  open,
  onOpenChange,
  group,
  availableGuests,
  eventId,
}: AssignGuestsSheetProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');

  const [tab, setTab] = useState<Tab>('out');
  const [qOut, setQOut] = useState('');
  const [qIn, setQIn] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draftIn, setDraftIn] = useState<Set<string>>(new Set());
  const [originalMemberIds, setOriginalMemberIds] = useState<Set<string>>(new Set());

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

  const dirty = useMemo(() => {
    const base = [...originalMemberIds].sort().join();
    const now = [...draftIn].sort().join();
    return base !== now;
  }, [originalMemberIds, draftIn]);

  const toggleMove = (guestId: string) => {
    setDraftIn((prev) => {
      const next = new Set(prev);
      if (isOut) next.add(guestId);
      else next.delete(guestId);
      return next;
    });
  };

  const toggleSelected = (guestId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every((g) => selected.has(g.id));

  const handleToggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((g) => g.id)));
  };

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

  const handleCancel = () => {
    onOpenChange(false);
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        // The default floating close button and the select-mode toggle both
        // want the same corner - drawn inline instead, matching the design,
        // so there's exactly one close affordance and nothing overlaps it.
        className="[&_[data-slot=sheet-close]]:hidden flex h-[92dvh] flex-col gap-0 overflow-clip rounded-t-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200"
      >
        <SheetHeader className="flex flex-col gap-3 border-b px-4 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-muted text-muted-foreground flex size-[34px] shrink-0 items-center justify-center rounded-[9px]"
              aria-label={tCommon('close')}
            >
              <IconX size={18} />
            </button>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-muted-foreground text-[11px]">
                {t('groups.mobile.eyebrowAssign')}
              </span>
              <SheetTitle className="truncate text-[17px]">
                {group?.name ?? ''}
              </SheetTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 shrink-0 rounded-full px-3 text-xs font-semibold',
                selectMode && 'border-primary/50 bg-primary/10 text-primary',
              )}
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
            >
              {selectMode ? t('groups.mobile.doneSelecting') : t('groups.mobile.selectMode')}
            </Button>
          </div>

          {/* Out / In segmented control */}
          <div className="bg-muted flex gap-[3px] rounded-[10px] p-[3px]">
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
                    'flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors',
                    active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-border text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-background flex items-center gap-2 rounded-[10px] border px-3 h-10">
            <IconSearch size={15} className="text-muted-foreground shrink-0" />
            <input
              value={isOut ? qOut : qIn}
              onChange={(e) => (isOut ? setQOut(e.target.value) : setQIn(e.target.value))}
              placeholder={
                isOut
                  ? t('groups.mobile.searchAvailablePlaceholder')
                  : t('groups.mobile.searchInGroupPlaceholder')
              }
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          {selectMode && (
            <div className="-mt-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {t('groups.mobile.selectedCount', { count: selected.size })}
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-primary text-xs font-semibold"
              >
                {allVisibleSelected
                  ? t('groups.mobile.clearSelection')
                  : t('groups.mobile.selectAllCount', { count: visible.length })}
              </button>
            </div>
          )}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {visible.map((g) => {
            const checked = selected.has(g.id);
            const wasMember = isOut && originalMemberIds.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => (selectMode ? toggleSelected(g.id) : toggleMove(g.id))}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[10px] p-2.5 text-start transition-colors',
                  checked ? 'bg-primary/8' : 'hover:bg-accent/60',
                )}
              >
                {selectMode && (
                  <span
                    className={cn(
                      'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {checked && <IconCheck size={12} />}
                  </span>
                )}
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold',
                    isOut ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                  )}
                >
                  {getInitials(g.name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{g.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {t('mobile.seats', { count: g.amount })}
                    {wasMember && ` · ${t('groups.mobile.removedInDraft')}`}
                  </span>
                </div>
                {!selectMode && (
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      isOut
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isOut ? <IconPlus size={18} /> : <IconMinus size={18} />}
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

        <SheetFooter className="flex-row items-center justify-between border-t px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-bold">
              {t('groups.mobile.inGroupCount', { count: inList.length })}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {dirty
                ? t('groups.mobile.unsavedChanges')
                : t('groups.mobile.ofTotalGuests', { count: pool.length })}
            </span>
          </div>
          {selectMode ? (
            <Button onClick={handleApplyBulk} disabled={selected.size === 0} className="shrink-0">
              {isOut
                ? t('groups.mobile.addSelected', { count: selected.size })
                : t('groups.mobile.removeSelected', { count: selected.size })}
            </Button>
          ) : (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!dirty}>
                {t('groups.assign.saveChanges')}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
