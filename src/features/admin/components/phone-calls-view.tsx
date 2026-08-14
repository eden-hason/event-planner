'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { IconCalendarEvent, IconChevronLeft, IconChevronRight, IconLoader2, IconPhone, IconPlus, IconSearch, IconTrash, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import {
  startCallRound,
  deleteCallRound,
  finishCallRound,
  reopenCallRound,
  createCallPlan,
  rescheduleCallPlan,
} from '../actions/calls';
import { getCallPlans, getRoundCallLogs } from '../queries/calls';
import { RoundGuestRow } from './round-guest-row';
import { CallPlanDialog } from './call-plan-dialog';
import type {
  CallPlanWithRound,
  CallRoundSummary,
  CallLogWithGuest,
  CallOutcome,
} from '../types';

type SummaryFilterKey = 'awaiting' | 'confirmed' | 'declined' | 'noAnswer';

/** yyyy-mm-dd for a date input, in local time */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const SUMMARY_STATS: {
  key: keyof CallRoundSummary;
  label: string;
  color: string;
}[] = [
  { key: 'awaiting', label: 'awaiting', color: 'text-slate-600' },
  { key: 'confirmed', label: 'confirmed', color: 'text-emerald-600' },
  { key: 'declined', label: 'declined', color: 'text-red-500' },
  { key: 'noAnswer', label: 'no answer', color: 'text-slate-400' },
];

interface PhoneCallsViewProps {
  eventId: string;
  initialPlans: CallPlanWithRound[];
}

/**
 * The back office's calling console.
 *
 * Works in *plans* rather than rounds: the Owner schedules call rounds like any
 * other outreach, and this executes them. A plan with no round yet is the
 * normal starting state, so the selector shows planned work as well as work in
 * progress. See docs/adr/0004.
 */
export function PhoneCallsView({ eventId, initialPlans }: PhoneCallsViewProps) {
  const [plans, setPlans] = useState<CallPlanWithRound[]>(initialPlans);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    initialPlans[0]?.scheduleId ?? null,
  );
  const [logs, setLogs] = useState<CallLogWithGuest[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isStarting, startTransition] = useTransition();
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
  const [togglingRoundId, setTogglingRoundId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [planDialog, setPlanDialog] = useState<
    { mode: 'create' } | { mode: 'reschedule'; plan: CallPlanWithRound } | null
  >(null);
  const [activeFilter, setActiveFilter] = useState<SummaryFilterKey | null>(null);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('lg');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = { sm: 51, md: 59, lg: 67 } as const;
  const { pageSize } = useDynamicPageSize({ containerRef: tableContainerRef, rowHeight: ROW_HEIGHT[fontSize] });

  const selectedPlan = plans.find((p) => p.scheduleId === selectedScheduleId);
  const selectedRound = selectedPlan?.round ?? null;
  const selectedRoundId = selectedRound?.id ?? null;

  useEffect(() => {
    setActiveFilter(null);
    setSearch('');
    setPageIndex(0);
    // A plan with no round has nothing to load - the guests are snapshotted at
    // Start, so before that there is no roster to show.
    if (!selectedRoundId) {
      setLogs([]);
      return;
    }
    setLoadingLogs(true);
    getRoundCallLogs(selectedRoundId)
      .then(setLogs)
      .finally(() => setLoadingLogs(false));
  }, [selectedRoundId]);

  async function handleStartRound(plan: CallPlanWithRound) {
    startTransition(async () => {
      const promise = startCallRound(plan.scheduleId, eventId).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });

      toast.promise(promise, {
        loading: 'Starting round…',
        success: async (data) => {
          setPlans(await getCallPlans(eventId));
          setSelectedScheduleId(plan.scheduleId);
          return data.message;
        },
        error: (err) => (err instanceof Error ? err.message : 'Failed to start round'),
      });

      await promise.catch(() => {});
    });
  }

  async function handleSavePlan(values: {
    scheduledDate: string;
    scheduledTime: string;
    targetStatus: 'pending' | 'confirmed';
  }) {
    const editing = planDialog?.mode === 'reschedule' ? planDialog.plan : null;

    const promise = (
      editing
        ? rescheduleCallPlan(editing.scheduleId, eventId, {
            scheduledDate: values.scheduledDate,
            scheduledTime: values.scheduledTime,
          })
        : createCallPlan(eventId, values)
    ).then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: editing ? 'Rescheduling…' : 'Planning round…',
      success: async (data) => {
        setPlans(await getCallPlans(eventId));
        if (data.scheduleId) setSelectedScheduleId(data.scheduleId);
        return data.message;
      },
      error: (err) => (err instanceof Error ? err.message : 'Failed to save call round'),
    });

    await promise.catch(() => {});
    setPlanDialog(null);
  }

  // Finishing is what the Owner sees as a green dot on their schedules page,
  // so it is a deliberate click - not something derived from the log counts.
  async function handleToggleRoundCompletion(round: CallRoundSummary) {
    const isCompleted = round.status === 'completed';
    setTogglingRoundId(round.id);

    const promise = (
      isCompleted ? reopenCallRound(round.id, eventId) : finishCallRound(round.id, eventId)
    ).then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: isCompleted ? 'Reopening round…' : 'Finishing round…',
      success: async (data) => {
        setPlans(await getCallPlans(eventId));
        return data.message;
      },
      error: (err) => (err instanceof Error ? err.message : 'Failed to update round'),
    });

    try {
      await promise;
    } catch {
      // toast already surfaced it
    }
    setTogglingRoundId(null);
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
        // The plan survives the round and goes back to planned, so selection
        // stays where it is rather than jumping to another round.
        setPlans(await getCallPlans(eventId));
        setLogs([]);
        return 'Round deleted';
      },
      error: (err) => (err instanceof Error ? err.message : 'Failed to delete round'),
    });

    await promise.catch(() => {});
    setDeletingRoundId(null);
  }

  async function handleOutcomeChange(logId: string, outcome: CallOutcome) {
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, outcome } : l)));
    setPlans(await getCallPlans(eventId));
  }

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
  };

  const searchQuery = search.trim().toLowerCase();
  const searchedLogs = searchQuery
    ? sortedLogs.filter(
        (l) =>
          l.name.toLowerCase().includes(searchQuery) ||
          (l.phone ?? '').replace(/-/g, '').includes(searchQuery.replace(/-/g, '')),
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
      {/* Plan selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {plans.map((plan) => {
            const isSelected = selectedScheduleId === plan.scheduleId;
            const round = plan.round;
            const isDeleting = round ? deletingRoundId === round.id : false;
            const isComplete = round?.status === 'completed';
            // Once an outcome is recorded the round is history the Owner can
            // already see - it can be finished, but not made to disappear.
            const hasOutcomes = round ? round.total - round.awaiting > 0 : false;
            return (
              <div key={plan.scheduleId} className="group relative">
                <button
                  onClick={() => setSelectedScheduleId(plan.scheduleId)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    plan.cancelled && 'line-through opacity-60',
                  )}
                >
                  <span>Round {plan.planNumber}</span>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      isSelected ? 'text-background/50' : 'text-muted-foreground/50',
                    )}
                  >
                    {round
                      ? `${round.awaiting}/${round.total}`
                      : new Date(plan.scheduledDate).toLocaleDateString()}
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
                {round && !hasOutcomes && (
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
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {selectedRound && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleToggleRoundCompletion(selectedRound)}
              disabled={togglingRoundId === selectedRound.id}
            >
              {togglingRoundId === selectedRound.id ? (
                <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <IconCheck className="mr-1.5 h-3.5 w-3.5" />
              )}
              {selectedRound.status === 'completed' ? 'Reopen round' : 'Finish round'}
            </Button>
          )}
          {selectedPlan && !selectedRound && !selectedPlan.cancelled && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPlanDialog({ mode: 'reschedule', plan: selectedPlan })}
              >
                <IconCalendarEvent className="mr-1.5 h-3.5 w-3.5" />
                Reschedule
              </Button>
              <Button
                size="sm"
                onClick={() => handleStartRound(selectedPlan)}
                disabled={isStarting}
              >
                {isStarting ? (
                  <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconPhone className="mr-1.5 h-3.5 w-3.5" />
                )}
                Start round
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setPlanDialog({ mode: 'create' })}>
            <IconPlus className="mr-1.5 h-3.5 w-3.5" />
            Add call round
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <IconPhone className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No call rounds planned</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a call round to schedule one, then start it to load the guests
          </p>
        </div>
      ) : !selectedRound ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <IconPhone className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {selectedPlan?.cancelled ? 'This round was cancelled' : 'Not started yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedPlan?.cancelled
              ? 'The owner switched this round off in their schedule'
              : `Planned for ${selectedPlan ? new Date(selectedPlan.scheduledDate).toLocaleDateString() : ''} - starting it loads the ${selectedPlan?.targetStatus ?? 'matching'} guests`}
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
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={fontSize}
              onValueChange={(v) => { if (v) { setFontSize(v as 'sm' | 'md' | 'lg'); setPageIndex(0); } }}
              className="ml-auto"
            >
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <ToggleGroupItem key={size} value={size} className="h-7 w-9 text-xs">
                  {size.toUpperCase()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
              <>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {(['Guest', 'Phone', 'Group', 'Side', 'Outcome', 'Notes'] as const).map((col) => (
                        <th
                          key={col}
                          className={cn(
                            'px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground',
                            { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' }[fontSize],
                            col === 'Group' && 'w-28',
                            col === 'Side' && 'w-20',
                            col === 'Phone' && 'w-32',
                            col === 'Notes' && 'w-44',
                          )}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedLogs.map((log) => (
                      <RoundGuestRow
                        key={log.id}
                        log={log}
                        eventId={eventId}
                        fontSize={fontSize}
                        onOutcomeChange={handleOutcomeChange}
                      />
                    ))}
                  </tbody>
                </table>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filteredLogs.length)} of {filteredLogs.length}
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
          </div>
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

      <CallPlanDialog
        open={!!planDialog}
        mode={planDialog?.mode ?? 'create'}
        initialDate={
          planDialog?.mode === 'reschedule'
            ? toDateInput(planDialog.plan.scheduledDate)
            : undefined
        }
        initialTime={
          planDialog?.mode === 'reschedule'
            ? (planDialog.plan.scheduledTime?.slice(0, 5) ?? '10:00')
            : undefined
        }
        initialTarget={
          planDialog?.mode === 'reschedule'
            ? (planDialog.plan.targetStatus ?? 'pending')
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) setPlanDialog(null);
        }}
        onSave={handleSavePlan}
      />
    </div>
  );
}
