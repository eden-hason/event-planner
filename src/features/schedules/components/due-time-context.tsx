'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { israelWallClockParts } from '@/lib/date-time';

import {
  dueTimeIssue as findDueTimeIssue,
  pastDueTime,
  type DueTimeIssue,
  type DueTimeRules,
  type PastDueTime,
} from '../utils/due-time-guards';
import type { MessagePlan } from '../utils/message-plan-kind';
import { DEFAULT_SEND_TIME } from '../utils/timeline';

// Read back out of the Due Time rather than stored beside it: there is one
// instant, and the clock face is a view of it (ADR 0015).
// An Undated Schedule starts on the default hour: a time alone sends nothing,
// so only the date is left for the Owner to choose (ADR 0029).
function timeOf(dueTime: string | null): string {
  return dueTime ? israelWallClockParts(dueTime).time : DEFAULT_SEND_TIME;
}

/**
 * An open Schedule's Due Time as it is being edited, on either Message Plan:
 * the picked date and hour, why the edit cannot be saved, and the past-time
 * question at Save. Each plan's settings provider owns one through
 * `useDueTimeField` and shares it through `DueTimeProvider`, which the timing
 * card and the past-time dialog read.
 */
export type DueTimeField = {
  /** The Due Time, as an instant. Empty while an Undated Schedule has no date picked. */
  scheduledDate: string;
  setScheduledDate: (iso: string) => void;
  /** The Israel wall clock of the Due Time, `HH:mm`. */
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  /**
   * The moment the Due Time was last edited. The guards compare against it
   * rather than reading the clock during render, and it moves with every edit
   * so a page left open for an hour is not judged against when it loaded.
   */
  now: Date;
  dateDirty: boolean;
  /** Why the edited Due Time cannot be saved, or null. Never set while unedited. */
  dueTimeIssue: DueTimeIssue | null;
  /** Puts the Due Time back to what is saved. */
  revert: () => void;
  /** Takes the edited Due Time as saved. */
  markSaved: () => void;
  /**
   * Runs `commit`, first asking to confirm when the edited Due Time has already
   * passed. The past-time check belongs at Save, not on each field: date and
   * time are picked separately, so the Due Time is only final when saved.
   */
  guardSave: (commit: () => void) => void;
  /** The past Due Time waiting on the organiser's confirmation, or null. */
  pendingPastDueTime: PastDueTime | null;
  confirmPastDueTime: () => void;
  cancelPastDueTime: () => void;
};

export function useDueTimeField({
  initial,
  editable,
  eventDate,
  scheduleTypeKey,
  messagePlan,
  rules,
}: {
  initial: string | null;
  editable: boolean;
  eventDate: string | null;
  scheduleTypeKey: string;
  messagePlan: MessagePlan;
  rules: DueTimeRules;
}): DueTimeField {
  const [savedDate, setSavedDate] = useState(initial ?? '');
  const [scheduledDate, setScheduledDateState] = useState(initial ?? '');
  const [scheduledTime, setScheduledTime] = useState(() => timeOf(initial));
  const [now, setNow] = useState(() => new Date());
  const [pendingPastDueTime, setPendingPastDueTime] = useState<PastDueTime | null>(null);
  const pendingCommit = useRef<(() => void) | null>(null);

  const setScheduledDate = useCallback((iso: string) => {
    setScheduledDateState(iso);
    setNow(new Date());
  }, []);

  const dateDirty = editable && scheduledDate !== savedDate;

  // Only an edited Due Time is judged: one the organiser did not touch is not
  // theirs to fix here (a moved Event date is backlog 0008).
  const dueTimeIssue = useMemo(
    () =>
      dateDirty
        ? findDueTimeIssue({ eventDate, scheduleTypeKey, scheduledDate, now, rules, messagePlan })
        : null,
    [dateDirty, eventDate, scheduleTypeKey, scheduledDate, now, rules, messagePlan],
  );

  const revert = useCallback(() => {
    setScheduledDateState(savedDate);
    setScheduledTime(timeOf(savedDate));
    setPendingPastDueTime(null);
  }, [savedDate]);

  const markSaved = useCallback(() => setSavedDate(scheduledDate), [scheduledDate]);

  const guardSave = useCallback(
    (commit: () => void) => {
      if (dateDirty) {
        // The clock is read afresh, because "past" is about the moment it is saved.
        const past = pastDueTime(scheduledDate, new Date(), rules);
        if (past) {
          // 'expires' is a block, not a question; it only reaches here if the
          // clock moved on since the last edit. The server refuses it as well.
          if (past.kind === 'expires') {
            setNow(new Date());
            return;
          }
          pendingCommit.current = commit;
          setPendingPastDueTime(past);
          return;
        }
      }
      commit();
    },
    [dateDirty, scheduledDate, rules],
  );

  const confirmPastDueTime = useCallback(() => {
    setPendingPastDueTime(null);
    pendingCommit.current?.();
    pendingCommit.current = null;
  }, []);

  const cancelPastDueTime = useCallback(() => {
    setPendingPastDueTime(null);
    pendingCommit.current = null;
  }, []);

  return useMemo(
    () => ({
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
      now,
      dateDirty,
      dueTimeIssue,
      revert,
      markSaved,
      guardSave,
      pendingPastDueTime,
      confirmPastDueTime,
      cancelPastDueTime,
    }),
    [
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      now,
      dateDirty,
      dueTimeIssue,
      revert,
      markSaved,
      guardSave,
      pendingPastDueTime,
      confirmPastDueTime,
      cancelPastDueTime,
    ],
  );
}

/** What the timing card and the past-time dialog read. */
export type DueTimeSettings = DueTimeField & {
  /** False once nothing about this Schedule can be changed any more. */
  editable: boolean;
  isSaving: boolean;
  /** The Event's Message Plan, whose Due Time day rules differ (ADR 0053). */
  messagePlan: MessagePlan;
};

const DueTimeContext = createContext<DueTimeSettings | null>(null);

export function DueTimeProvider({
  value,
  children,
}: {
  value: DueTimeSettings;
  children: React.ReactNode;
}) {
  return <DueTimeContext.Provider value={value}>{children}</DueTimeContext.Provider>;
}

export function useDueTime() {
  const context = useContext(DueTimeContext);
  if (!context) throw new Error('useDueTime must be used within a DueTimeProvider');
  return context;
}
