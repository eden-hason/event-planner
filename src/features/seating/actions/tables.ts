'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_CAPACITY,
  TableAppToDbTransformerSchema,
  TableBatchCreateSchema,
  TableDbToAppTransformerSchema,
  TableUpsertSchema,
  type TableApp,
  type TableBatchCreate,
  type TableRotation,
  type TableShape,
  type TableUpsert,
} from '../schemas';
import { batchPositions, nextFreePosition } from '../utils/auto-place';
import { isUniqueViolation, toSeatingFailure, type SeatingFailure } from './errors';

export type SeatingActionState<T = undefined> = {
  success: boolean;
  /** Structured reason, so the UI can build copy that names the numbers. */
  failure?: SeatingFailure;
  data?: T;
};

export type UpsertTableState = SeatingActionState<TableApp>;
export type BatchCreateTablesState = SeatingActionState<{ created: number }>;
export type DeleteTableState = SeatingActionState;
export type UpdatePositionState = SeatingActionState;

/**
 * Both the Seating Plan and the Guest Directory read a Table's number, so a
 * mutation on either has to refresh the other.
 */
const revalidateSeating = (eventId: string) => {
  revalidatePath(`/app/${eventId}/seating`);
  revalidatePath(`/app/${eventId}/guests`);
};

const numeric = (value: FormDataEntryValue | null): number | undefined => {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function parseUpsert(formData: FormData): TableUpsert | null {
  const label = formData.get('label');
  const shape = formData.get('shape');

  const candidate = {
    id: formData.get('id') ?? undefined,
    label: label === null ? undefined : label === '' ? null : String(label),
    shape: shape === null ? undefined : String(shape),
    capacity: numeric(formData.get('capacity')),
    rotation: numeric(formData.get('rotation')),
    tableNumber: numeric(formData.get('tableNumber')),
    positionX: numeric(formData.get('positionX')),
    positionY: numeric(formData.get('positionY')),
  };

  const parsed = TableUpsertSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Every existing number in the Event, which both creation flows need. */
async function usedNumbers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
) {
  const { data } = await supabase
    .from('tables')
    .select('table_number, shape, capacity, rotation, position_x, position_y')
    .eq('event_id', eventId);

  return {
    numbers: new Set((data ?? []).map((row) => row.table_number as number)),
    boxes: (data ?? []).map((row) => ({
      positionX: row.position_x as number,
      positionY: row.position_y as number,
      shape: row.shape as TableShape,
      capacity: row.capacity as number,
      // Measured the way it is drawn: a quarter-turned long Table is taller
      // than it is wide, and a new Table dropped beside it must not overlap.
      rotation: row.rotation as TableRotation,
    })),
  };
}

export async function createTable(
  eventId: string,
  formData: FormData,
): Promise<UpsertTableState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  const values = parseUpsert(formData);
  if (!values) return { success: false, failure: { kind: 'unknown' } };

  const supabase = await createClient();
  const { numbers, boxes } = await usedNumbers(supabase, eventId);

  // ADR-0008: new Tables take the next integer after the current highest.
  // Numbering gaps are never reused automatically - a planner fills one
  // deliberately by editing a number.
  const tableNumber =
    values.tableNumber ??
    (numbers.size === 0 ? 1 : Math.max(...numbers) + 1);

  if (values.tableNumber !== undefined && numbers.has(values.tableNumber)) {
    return {
      success: false,
      failure: { kind: 'duplicateNumbers', numbers: [values.tableNumber] },
    };
  }

  const shape = values.shape ?? 'round';
  const capacity = values.capacity ?? DEFAULT_CAPACITY;
  const position =
    values.positionX !== undefined && values.positionY !== undefined
      ? { positionX: values.positionX, positionY: values.positionY }
      : nextFreePosition(boxes, shape, capacity);

  const payload = TableAppToDbTransformerSchema.parse({
    ...values,
    shape,
    capacity,
    tableNumber,
    ...position,
  });

  const { data, error } = await supabase
    .from('tables')
    .insert({ ...payload, event_id: eventId })
    .select('*')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        failure: { kind: 'duplicateNumbers', numbers: [tableNumber] },
      };
    }
    console.error('Error creating table:', error);
    return { success: false, failure: toSeatingFailure(error) };
  }

  revalidateSeating(eventId);
  return { success: true, data: TableDbToAppTransformerSchema.parse(data) };
}

/**
 * Batch creation is atomic (ADR-0008): if any requested number conflicts, none
 * of the batch is created. The conflict is detected up front so the dialog can
 * name the taken numbers and suggest a starting point, and a single insert
 * statement plus the unique constraint keeps it true under a race.
 */
export async function createTablesBatch(
  eventId: string,
  input: TableBatchCreate,
): Promise<BatchCreateTablesState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  const parsed = TableBatchCreateSchema.safeParse(input);
  if (!parsed.success) return { success: false, failure: { kind: 'unknown' } };

  const { quantity, startNumber, capacity, shape } = parsed.data;

  const supabase = await createClient();
  const { numbers, boxes } = await usedNumbers(supabase, eventId);

  const wanted = Array.from({ length: quantity }, (_, i) => startNumber + i);
  const clashes = wanted.filter((n) => numbers.has(n));
  if (clashes.length > 0) {
    return { success: false, failure: { kind: 'duplicateNumbers', numbers: clashes } };
  }

  const positions = batchPositions(boxes, shape, capacity, quantity);

  const { error } = await supabase.from('tables').insert(
    wanted.map((tableNumber, i) => ({
      event_id: eventId,
      table_number: tableNumber,
      capacity,
      shape,
      label: null,
      position_x: positions[i].positionX,
      position_y: positions[i].positionY,
    })),
  );

  if (error) {
    if (isUniqueViolation(error)) {
      return { success: false, failure: { kind: 'duplicateNumbers', numbers: wanted } };
    }
    console.error('Error creating tables in batch:', error);
    return { success: false, failure: toSeatingFailure(error) };
  }

  revalidateSeating(eventId);
  return { success: true, data: { created: quantity } };
}

export async function updateTable(
  eventId: string,
  formData: FormData,
): Promise<UpsertTableState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  const values = parseUpsert(formData);
  if (!values?.id) return { success: false, failure: { kind: 'unknown' } };

  const supabase = await createClient();
  const payload = TableAppToDbTransformerSchema.parse(values);
  delete payload.id;

  const { data, error } = await supabase
    .from('tables')
    .update(payload)
    .eq('id', values.id)
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        failure: {
          kind: 'duplicateNumbers',
          numbers: values.tableNumber ? [values.tableNumber] : [],
        },
      };
    }
    // Shrinking below current occupancy lands here, carrying both numbers.
    return { success: false, failure: toSeatingFailure(error) };
  }

  revalidateSeating(eventId);
  return { success: true, data: TableDbToAppTransformerSchema.parse(data) };
}

export async function deleteTable(
  eventId: string,
  tableId: string,
): Promise<DeleteTableState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId)
    .eq('event_id', eventId);

  if (error) {
    // A Seating Manager deleting a Table that holds guests outside their scope
    // lands here. The refusal names nobody.
    return { success: false, failure: toSeatingFailure(error) };
  }

  revalidateSeating(eventId);
  return { success: true };
}

/**
 * Canvas position only. Kept separate from `updateTable` because it fires on
 * every drag and carries nothing that could fail validation: position has no
 * capacity meaning (ADR-0008), so this can never reject.
 */
export async function updateTablePosition(
  eventId: string,
  tableId: string,
  positionX: number,
  positionY: number,
): Promise<UpdatePositionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tables')
    .update({ position_x: positionX, position_y: positionY })
    .eq('id', tableId)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error updating table position:', error);
    return { success: false, failure: toSeatingFailure(error) };
  }

  // Deliberately no revalidate: the canvas already moved optimistically, and
  // re-rendering the page under the planner's cursor would fight the drag.
  return { success: true };
}
