'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { IconChevronLeft, IconChevronRight, IconLoader2, IconPhone, IconSearch, IconTrash, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { useDynamicPageSize } from '@/hooks/use-dynamic-page-size';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { startCallRound, deleteCallRound } from '../actions/calls';
import { getCallRounds, getRoundCallLogs } from '../queries/calls';
import { RoundGuestRow } from './round-guest-row';
import type { CallRoundSummary, CallLogWithGuest, CallOutcome } from '../types';

type SummaryFilterKey = 'awaiting' | 'confirmed' | 'declined' | 'noAnswer' | 'callBack' | 'wrongNumber';

const SUMMARY_STATS: {
  key: keyof CallRoundSummary;
  label: string;
  color: string;
}[] = [
  { key: 'awaiting', label: 'awaiting', color: 'text-slate-600' },
  { key: 'confirmed', label: 'confirmed', color: 'text-emerald-600' },
  { key: 'declined', label: 'declined', color: 'text-red-500' },
  { key: 'noAnswer', label: 'no answer', color: 'text-slate-400' },
  { key: 'callBack', label: 'call back', color: 'text-blue-500' },
  { key: 'wrongNumber', label: 'wrong #', color: 'text-amber-500' },
];

interface PhoneCallsViewProps {
  eventId: string;
  initialRounds: CallRoundSummary[];
}

export function PhoneCallsView({ eventId, initialRounds }: PhoneCallsViewProps) {
  const [rounds, setRounds] = useState<CallRoundSummary[]>(initialRounds);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(
    initialRounds[0]?.id ?? null,
  );
  const [logs, setLogs] = useState<CallLogWithGuest[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isStarting, startTransition] = useTransition();
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SummaryFilterKey | null>(null);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { pageSize } = useDynamicPageSize({ containerRef: tableContainerRef, rowHeight: 57 });

  useEffect(() => {
    if (!selectedRoundId) return;
    setActiveFilter(null);
    setSearch('');
    setPageIndex(0);
    setLoadingLogs(true);
    getRoundCallLogs(selectedRoundId)
      .then(setLogs)
      .finally(() => setLoadingLogs(false));
  }, [selectedRoundId]);

  async function handleStartRound() {
    startTransition(async () => {
      const promise = startCallRound(eventId).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });

      toast.promise(promise, {
        loading: 'Starting round…',
        success: async (data) => {
          const updated = await getCallRounds(eventId);
          setRounds(updated);
          if (data.roundId) setSelectedRoundId(data.roundId);
          return data.message;
        },
        error: (err) => (err instanceof Error ? err.message : 'Failed to start round'),
      });

      await promise.catch(() => {});
    });
  }

  async function handleDeleteRound(roundId: string) {
    setDeletingRoundId(roundId);
    const promise = deleteCallRound(roundId, eventId).then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: 'Deleting round…',
      success: async () => {
        const updated = await getCallRounds(eventId);
        setRounds(updated);
        if (selectedRoundId === roundId) {
          setSelectedRoundId(updated[0]?.id ?? null);
          setLogs([]);
        }
        return 'Round deleted';
      },
      error: (err) => (err instanceof Error ? err.message : 'Failed to delete round'),
    });

    await promise.catch(() => {});
    setDeletingRoundId(null);
  }

  async function handleOutcomeChange(logId: string, outcome: CallOutcome) {
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, outcome } : l)));
    const updated = await getCallRounds(eventId);
    setRounds(updated);
  }

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  const sortedLogs = [...logs].sort((a, b) => {
    if (!a.outcome && b.outcome) return -1;
    if (a.outcome && !b.outcome) return 1;
    return 0;
  });

  const FILTER_PREDICATES: Record<SummaryFilterKey, (log: CallLogWithGuest) => boolean> = {
    awaiting: (log) => log.outcome === null,
    confirmed: (log) => log.outcome === 'confirmed',
    declined: (log) => log.outcome === 'declined',
    noAnswer: (log) => log.outcome === 'no_answer',
    callBack: (log) => log.outcome === 'call_back',
    wrongNumber: (log) => log.outcome === 'wrong_number',
  };

  const searchQuery = search.trim().toLowerCase();
  const searchedLogs = searchQuery
    ? sortedLogs.filter(
        (l) =>
          l.name.toLowerCase().includes(searchQuery) ||
          (l.phone ?? '').includes(searchQuery),
      )
    : sortedLogs;

  const filteredLogs = activeFilter
    ? searchedLogs.filter(FILTER_PREDICATES[activeFilter])
    : searchedLogs;

  const pageCount = Math.ceil(filteredLogs.length / pageSize);
  const displayedLogs = filteredLogs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPageIndex(0);
  }

  function handleFilterChange(key: SummaryFilterKey | null) {
    setActiveFilter(key);
    setPageIndex(0);
  }

  return (
    <div className="space-y-4">
      {/* Round selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {rounds.map((round) => {
            const isSelected = selectedRoundId === round.id;
            const isDeleting = deletingRoundId === round.id;
            const isComplete = round.awaiting === 0 && round.total > 0;
            return (
              <div key={round.id} className="group relative">
                <button
                  onClick={() => setSelectedRoundId(round.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>Round {round.roundNumber}</span>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      isSelected ? 'text-background/50' : 'text-muted-foreground/50',
                    )}
                  >
                    {round.awaiting}/{round.total}
                  </span>
                  {isComplete && (
                    <IconCheck
                      className={cn(
                        'h-3 w-3',
                        isSelected ? 'text-background/60' : 'text-emerald-500',
                      )}
                    />
                  )}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(round.id)}
                  disabled={isDeleting}
                  title="Delete round"
                  className="absolute -top-1.5 -right-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm hover:bg-destructive/10 hover:text-destructive group-hover:flex disabled:pointer-events-none"
                >
                  {isDeleting ? (
                    <IconLoader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <IconTrash className="h-2.5 w-2.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={handleStartRound} disabled={isStarting}>
          {isStarting ? (
            <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <IconPhone className="mr-1.5 h-3.5 w-3.5" />
          )}
          New round
        </Button>
      </div>

      {rounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <IconPhone className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No call rounds yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a round to load pending guests and begin tracking calls
          </p>
        </div>
      ) : (
        <>
          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search guests…"
                className="h-7 pl-8 pr-3 text-xs w-44"
              />
            </div>
            {selectedRound && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
              {SUMMARY_STATS.filter(({ key }) => (selectedRound[key] as number) > 0).map(
                ({ key, label, color }) => (
                  <Toggle
                    key={key}
                    size="sm"
                    pressed={activeFilter === key}
                    onPressedChange={(pressed) =>
                      handleFilterChange(pressed ? (key as SummaryFilterKey) : null)
                    }
                    className="h-auto px-2 py-1 gap-1 rounded-full data-[state=on]:bg-muted data-[state=on]:ring-1 data-[state=on]:ring-border"
                  >
                    <span className={cn('font-semibold tabular-nums', color)}>
                      {selectedRound[key] as number}
                    </span>
                    <span className="text-muted-foreground">{label}</span>
                  </Toggle>
                ),
              )}
            </div>
            )}
          </div>

          {/* Table */}
          <div ref={tableContainerRef} className="rounded-lg border overflow-hidden">
            {loadingLogs ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                {search || activeFilter ? 'No guests match' : 'No guests in this round'}
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Guest
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-32">
                      Phone
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Outcome
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-44">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedLogs.map((log) => (
                    <RoundGuestRow
                      key={log.id}
                      log={log}
                      eventId={eventId}
                      onOutcomeChange={handleOutcomeChange}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setPageIndex((p) => p - 1)}
                  disabled={pageIndex === 0}
                >
                  <IconChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setPageIndex((p) => p + 1)}
                  disabled={pageIndex >= pageCount - 1}
                >
                  <IconChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent dir="ltr">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete round?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the round and all its call logs. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteId) {
                  handleDeleteRound(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
