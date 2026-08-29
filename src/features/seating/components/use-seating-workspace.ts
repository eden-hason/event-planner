'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { assignGuestsToTable, createTable, createTablesBatch, deleteTable, updateTable, updateTablePosition } from '../actions';
import {
  DEFAULT_CAPACITY,
  type TableBatchCreate,
  type TableRotation,
  type TableShape,
} from '../schemas';
import type { SeatingPageProps, TableApp, TableView } from '../types';
import {
  composeProgress,
  guestProgressCounts,
  headCount,
} from '../utils/occupancy';
import {
  applyAssignment,
  applyPosition,
  applyTableRemoval,
  applyTableUpdate,
  restoreRemovedTable,
  revertAssignment,
  type SeatingState,
} from '../utils/optimistic';
import type { SeatingFailure } from '../actions';
import type { GuestWithGroupApp } from '@/features/guests';
import type { TableFormValues } from './table-form-dialog';
import { useSeatingCopy } from './use-seating-copy';

const POSITION_DEBOUNCE_MS = 300;

/**
 * Server Actions here report failure in their result rather than throwing, but
 * `toast.promise` needs a promise that rejects. This wraps the result so a
 * refusal becomes a throw carrying the structured `SeatingFailure`, which the
 * `error` callback turns into copy that names the numbers.
 */
class SeatingActionError extends Error {
  constructor(readonly failure: SeatingFailure | undefined) {
    super(failure?.kind ?? 'unknown');
    this.name = 'SeatingActionError';
  }
}

const rejectOnFailure = async <T extends { success: boolean; failure?: SeatingFailure }>(
  result: Promise<T>,
): Promise<T> => {
  const resolved = await result;
  if (!resolved.success) throw new SeatingActionError(resolved.failure);
  return resolved;
};

export type SeatingDialog =
  | { kind: 'none' }
  | { kind: 'assign'; guestIds: string[] }
  | { kind: 'create' }
  | { kind: 'edit'; tableId: string }
  | { kind: 'batch' }
  | { kind: 'delete'; tableId: string };

/**
 * All Seating Plan state and every mutation, in one hook.
 *
 * Desktop and mobile are two presentations of the same plan (ADR-0009), so
 * they share this outright rather than each keeping their own copy. That is
 * also what guarantees the picker, the bulk bar and drag-and-drop go through
 * the same assignment call and the same capacity validation.
 */
export function useSeatingWorkspace(props: SeatingPageProps) {
  const { eventId, isScopedCollaborator } = props;
  const { t, tableTitle, failureMessage } = useSeatingCopy();

  const [state, setState] = React.useState<SeatingState>({
    tables: props.tables,
    guests: props.guests.filter((guest) => guest.rsvpStatus !== 'declined'),
  });
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [openTableId, setOpenTableId] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<SeatingDialog>({ kind: 'none' });
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Search is one behavior shared by desktop and mobile: it spans every
  // participating record, not just the Unassigned list, so looking someone up
  // never dead-ends on the empty state when they are already seated. An
  // Unassigned hit stays actionable where it sits; a seated hit is revealed in
  // its Table (the detail panel opens and the row is briefly highlighted).
  const [query, setQuery] = React.useState('');
  const [highlightGuestId, setHighlightGuestId] = React.useState<string | null>(
    null,
  );
  const highlightTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  // Revalidation is the source of truth; local edits are only an echo of it.
  React.useEffect(() => {
    setState({
      tables: props.tables,
      guests: props.guests.filter((guest) => guest.rsvpStatus !== 'declined'),
    });
  }, [props.tables, props.guests]);

  const scaleRef = React.useRef(1);
  const positionTimers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  React.useEffect(() => {
    const timers = positionTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const unrestrictedDelete = !isScopedCollaborator;

  const unassigned = React.useMemo(
    () => state.guests.filter((guest) => !guest.tableId),
    [state.guests],
  );

  // `props.progress` is the Event-wide truth from the privileged aggregate. A
  // scoped collaborator's `state.guests` is only their slice, so recomputing
  // progress from it would drop every out-of-scope confirmed record and let the
  // bar reach 100% early. Instead the server baseline is carried forward and
  // only the delta of the records this collaborator actually moved is applied -
  // hidden counts stay exactly where the server put them.
  const baselineVisibleCounts = React.useMemo(
    () =>
      guestProgressCounts(
        props.guests.filter((guest) => guest.rsvpStatus !== 'declined'),
      ),
    [props.guests],
  );

  const progress = React.useMemo(() => {
    const base = props.progress;
    const now = guestProgressCounts(state.guests);
    return composeProgress(state.tables, {
      confirmedRecordsTotal: base.confirmedRecordsTotal,
      confirmedRecordsSeated:
        base.confirmedRecordsSeated +
        (now.confirmedRecordsSeated - baselineVisibleCounts.confirmedRecordsSeated),
      confirmedGuestsTotal: base.confirmedGuestsTotal,
      confirmedGuestsSeated:
        base.confirmedGuestsSeated +
        (now.confirmedGuestsSeated - baselineVisibleCounts.confirmedGuestsSeated),
      pendingGuestsUnseated:
        base.pendingGuestsUnseated +
        (now.pendingGuestsUnseated - baselineVisibleCounts.pendingGuestsUnseated),
    });
  }, [state.tables, state.guests, props.progress, baselineVisibleCounts]);

  const tableById = React.useCallback(
    (tableId: string | null) =>
      tableId ? (state.tables.find((view) => view.table.id === tableId) ?? null) : null,
    [state.tables],
  );

  const guests = state.guests;
  const search = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (guest: GuestWithGroupApp) =>
      guest.name.toLowerCase().includes(term) ||
      (guest.group?.name ?? '').toLowerCase().includes(term);

    type SeatedMatch = { guest: GuestWithGroupApp; view: TableView };

    if (!term) {
      return {
        query,
        term: '',
        unassigned,
        seatedMatches: [] as SeatedMatch[],
      };
    }

    const seatedMatches = guests
      .filter((guest) => guest.tableId && matches(guest))
      .map((guest) => ({ guest, view: tableById(guest.tableId ?? null) }))
      .filter((hit): hit is SeatedMatch => hit.view !== null);

    return {
      query,
      term,
      unassigned: unassigned.filter(matches),
      seatedMatches,
    };
  }, [query, unassigned, guests, tableById]);

  const revealGuest = React.useCallback(
    (guestId: string) => {
      const guest = guests.find((candidate) => candidate.id === guestId);
      if (guest?.tableId) setOpenTableId(guest.tableId);
      setHighlightGuestId(guestId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(
        () => setHighlightGuestId(null),
        4000,
      );
    },
    [guests],
  );

  const usedNumbers = React.useMemo(
    () => state.tables.map((view) => view.table.tableNumber),
    [state.tables],
  );
  const highestNumber = usedNumbers.length === 0 ? 0 : Math.max(...usedNumbers);
  const nextNumber = highestNumber + 1;

  const closeDialog = React.useCallback(() => {
    setDialog({ kind: 'none' });
    setDialogError(null);
  }, []);

  // --- Assignment -----------------------------------------------------------

  const assign = React.useCallback(
    (guestIds: string[], tableId: string | null) => {
      const target = tableById(tableId);
      const moving = state.guests.filter((guest) => guestIds.includes(guest.id));
      if (moving.length === 0) return;

      const party = headCount(moving);
      // Captured for a delta rollback: putting each record back where it was,
      // rather than restoring a whole-state snapshot that would also undo a
      // later mutation that succeeded on other records.
      const origins = moving.map((guest) => ({
        id: guest.id,
        tableId: guest.tableId ?? null,
      }));

      // Seats a mover already occupies at the destination are not a second
      // claim on capacity, so they come back out of the "taken" figure. This
      // mirrors what the database does, which excludes the moving records from
      // its occupancy count for exactly the same reason.
      const freeForParty = target
        ? target.freeSeats +
          headCount(moving.filter((guest) => guest.tableId === target.table.id))
        : 0;

      // Reject locally when the answer is already known, so the planner gets
      // the shortfall immediately rather than after a round trip. The database
      // remains the authority (ADR-0008) - this only saves a doomed request.
      if (target && party > freeForParty) {
        const message = failureMessage(
          {
            kind: 'overCapacity',
            party,
            free: freeForParty,
            shortfall: party - freeForParty,
            records: moving.length,
          },
          { name: moving[0]?.name, table: target.table },
        );
        if (dialog.kind === 'assign') setDialogError(message);
        else toast.error(message);
        return;
      }

      setState((current) =>
        applyAssignment(current, guestIds, tableId, unrestrictedDelete),
      );
      setSelectedIds((current) => current.filter((id) => !guestIds.includes(id)));
      closeDialog();

      const from =
        !target && moving.length === 1
          ? tableById(moving[0].tableId ?? null)
          : null;

      const run = rejectOnFailure(
        assignGuestsToTable(eventId, guestIds, tableId),
      );

      toast.promise(run, {
        loading: t('toast.seating'),
        success: () =>
          target
            ? t('toast.seated', {
                count: party,
                table: tableTitle(target.table),
                free: Math.max(freeForParty - party, 0),
              })
            : t('toast.unseated', {
                name: moving[0]?.name ?? '',
                freed: party,
                table: from ? tableTitle(from.table) : '',
              }),
        error: (err) =>
          failureMessage(
            err instanceof SeatingActionError ? err.failure : undefined,
            {
              name: moving[0]?.name,
              table: target?.table,
              fallback: t('errors.assignFailed'),
            },
          ),
      });

      startTransition(async () => {
        try {
          await run;
        } catch {
          // Delta rollback on the current state - never a stale snapshot.
          setState((current) =>
            revertAssignment(current, origins, unrestrictedDelete),
          );
        }
      });
    },
    [
      closeDialog,
      dialog.kind,
      eventId,
      failureMessage,
      state,
      t,
      tableById,
      tableTitle,
      unrestrictedDelete,
    ],
  );

  const unassign = React.useCallback(
    (guestId: string) => assign([guestId], null),
    [assign],
  );

  // --- Tables ---------------------------------------------------------------

  const submitTableForm = React.useCallback(
    (values: TableFormValues) => {
      const editing = dialog.kind === 'edit' ? tableById(dialog.tableId) : null;

      const formData = new FormData();
      if (editing) formData.set('id', editing.table.id);
      formData.set('tableNumber', String(values.tableNumber));
      formData.set('label', values.label.trim());
      formData.set('capacity', String(values.capacity));
      formData.set('shape', values.shape);

      const run = rejectOnFailure(
        editing
          ? updateTable(eventId, formData)
          : createTable(eventId, formData),
      );

      toast.promise(run, {
        loading: editing ? t('toast.updatingTable') : t('toast.creatingTable'),
        success: (result) =>
          t(editing ? 'toast.updated' : 'toast.created', {
            table: result.data ? tableTitle(result.data) : '',
          }),
        error: (err) =>
          failureMessage(
            err instanceof SeatingActionError ? err.failure : undefined,
            {
              table: editing?.table,
              fallback: editing
                ? t('errors.updateFailed')
                : t('errors.createFailed'),
            },
          ),
      });

      startTransition(async () => {
        try {
          const result = await run;
          const table = result.data;
          if (table && editing) {
            setState((current) =>
              applyTableUpdate(current, table, unrestrictedDelete),
            );
          }
          closeDialog();
        } catch (err) {
          // Keep the dialog open on failure so the planner can fix the field.
          setDialogError(
            failureMessage(
              err instanceof SeatingActionError ? err.failure : undefined,
              {
                table: editing?.table,
                fallback: editing
                  ? t('errors.updateFailed')
                  : t('errors.createFailed'),
              },
            ),
          );
        }
      });
    },
    [
      closeDialog,
      dialog,
      eventId,
      failureMessage,
      t,
      tableById,
      tableTitle,
      unrestrictedDelete,
    ],
  );

  const submitBatch = React.useCallback(
    (values: TableBatchCreate) => {
      const run = rejectOnFailure(createTablesBatch(eventId, values));

      toast.promise(run, {
        loading: t('toast.creatingBatch'),
        success: () => t('toast.batchCreated', { count: values.quantity }),
        error: (err) =>
          failureMessage(
            err instanceof SeatingActionError ? err.failure : undefined,
            { fallback: t('errors.createFailed') },
          ),
      });

      startTransition(async () => {
        try {
          await run;
          closeDialog();
        } catch (err) {
          setDialogError(
            failureMessage(
              err instanceof SeatingActionError ? err.failure : undefined,
              { fallback: t('errors.createFailed') },
            ),
          );
        }
      });
    },
    [closeDialog, eventId, failureMessage, t],
  );

  /**
   * Shape and seats from the detail panel. Capacity is the only field here that
   * can be refused, and only for one reason: it may not drop below the people
   * already seated.
   */
  const patchTable = React.useCallback(
    (
      view: TableView,
      patch: { shape?: TableShape; capacity?: number; rotation?: TableRotation },
    ) => {
      const formData = new FormData();
      formData.set('id', view.table.id);
      if (patch.shape) formData.set('shape', patch.shape);
      if (patch.capacity !== undefined) formData.set('capacity', String(patch.capacity));
      if (patch.rotation !== undefined) formData.set('rotation', String(patch.rotation));

      const optimistic: TableApp = { ...view.table, ...patch };
      setState((current) =>
        applyTableUpdate(current, optimistic, unrestrictedDelete),
      );

      const run = rejectOnFailure(updateTable(eventId, formData));

      toast.promise(run, {
        loading: t('toast.updatingTable'),
        success: (result) =>
          t('toast.updated', {
            table: tableTitle(result.data ?? view.table),
          }),
        error: (err) =>
          failureMessage(
            err instanceof SeatingActionError ? err.failure : undefined,
            { table: view.table, fallback: t('errors.updateFailed') },
          ),
      });

      startTransition(async () => {
        try {
          await run;
        } catch {
          // Delta rollback: restore this Table's original fields on the current
          // state, leaving any concurrent successful edit to other Tables alone.
          setState((current) =>
            applyTableUpdate(current, view.table, unrestrictedDelete),
          );
        }
      });
    },
    [eventId, failureMessage, t, tableTitle, unrestrictedDelete],
  );

  const removeTable = React.useCallback(
    (view: TableView) => {
      const seatedGuestIds = view.guests.map((guest) => guest.id);
      setState((current) => applyTableRemoval(current, view.table.id));
      setOpenTableId(null);
      closeDialog();

      const run = rejectOnFailure(deleteTable(eventId, view.table.id));

      toast.promise(run, {
        loading: t('toast.deletingTable'),
        success: () => t('toast.deleted', { table: tableTitle(view.table) }),
        error: (err) =>
          failureMessage(
            err instanceof SeatingActionError ? err.failure : undefined,
            { table: view.table, fallback: t('errors.deleteFailed') },
          ),
      });

      startTransition(async () => {
        try {
          await run;
        } catch {
          // Delta rollback: re-insert this Table and return its records on the
          // current state, so a concurrent successful mutation is preserved.
          setState((current) =>
            restoreRemovedTable(current, view, seatedGuestIds),
          );
        }
      });
    },
    [closeDialog, eventId, failureMessage, t, tableTitle],
  );

  /**
   * Canvas drags fire continuously, so writes are debounced per table. Position
   * carries no capacity meaning, so a late write can never invalidate a plan -
   * which is why this stays exempt from the toast.promise treatment. A failed
   * write is still surfaced rather than swallowed, so the planner knows the
   * arrangement may snap back on refresh.
   */
  const moveTable = React.useCallback(
    (tableId: string, positionX: number, positionY: number) => {
      setState((current) => applyPosition(current, tableId, positionX, positionY));

      const timers = positionTimers.current;
      const existing = timers.get(tableId);
      if (existing) clearTimeout(existing);

      timers.set(
        tableId,
        setTimeout(() => {
          timers.delete(tableId);
          void updateTablePosition(eventId, tableId, positionX, positionY).then(
            (result) => {
              if (!result.success) toast.error(t('toast.positionFailed'));
            },
            () => toast.error(t('toast.positionFailed')),
          );
        }, POSITION_DEBOUNCE_MS),
      );
    },
    [eventId, t],
  );

  // --- Selection ------------------------------------------------------------

  const toggleSelect = React.useCallback((guestId: string) => {
    setSelectedIds((current) =>
      current.includes(guestId)
        ? current.filter((id) => id !== guestId)
        : [...current, guestId],
    );
  }, []);

  /** Adds without removing, so selecting a second group keeps the first. */
  const selectMany = React.useCallback((guestIds: string[]) => {
    setSelectedIds((current) => [...new Set([...current, ...guestIds])]);
  }, []);

  const openAssign = React.useCallback((guestIds: string[]) => {
    setDialogError(null);
    setDialog({ kind: 'assign', guestIds });
  }, []);

  const assignParty = React.useMemo(() => {
    if (dialog.kind !== 'assign') return { names: [] as string[], heads: 0 };
    const chosen = state.guests.filter((guest) => dialog.guestIds.includes(guest.id));
    return { names: chosen.map((guest) => guest.name), heads: headCount(chosen) };
  }, [dialog, state.guests]);

  return {
    tables: state.tables,
    guests: state.guests,
    unassigned,
    progress,
    selectedIds,
    openTableId,
    dialog,
    dialogError,
    isPending,
    scaleRef,
    nextNumber,
    highestNumber,
    usedNumbers,
    defaultCapacity: DEFAULT_CAPACITY,
    assignParty,
    search,
    setQuery,
    highlightGuestId,
    revealGuest,
    tableById,
    setOpenTableId,
    setDialog,
    closeDialog,
    openAssign,
    toggleSelect,
    selectMany,
    clearSelection: () => setSelectedIds([]),
    assign,
    unassign,
    submitTableForm,
    submitBatch,
    patchTable,
    removeTable,
    moveTable,
  };
}

export type SeatingWorkspace = ReturnType<typeof useSeatingWorkspace>;
