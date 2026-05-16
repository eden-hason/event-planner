'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import {
  TableAppToDbTransformerSchema,
  TableUpsertSchema,
  type TableApp,
} from '../schemas';
import { TableDbToAppTransformerSchema } from '../schemas';
import { nextFreePosition } from '../utils/auto-place';

export type UpsertTableState = {
  success: boolean;
  message?: string | null;
  table?: TableApp;
  errors?: z.ZodError<z.input<typeof TableUpsertSchema>>;
};

export type DeleteTableState = {
  success: boolean;
  message: string;
};

export type UpdatePositionState = {
  success: boolean;
  message?: string;
};

function parseFormDataAsUpsert(
  formData: FormData,
): z.infer<typeof TableUpsertSchema> | null {
  const raw = Object.fromEntries(formData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: Record<string, any> = { ...raw };
  if (parsed.capacity && typeof parsed.capacity === 'string') {
    parsed.capacity = Number(parsed.capacity);
  }
  if (parsed.positionX && typeof parsed.positionX === 'string') {
    parsed.positionX = Number(parsed.positionX);
  }
  if (parsed.positionY && typeof parsed.positionY === 'string') {
    parsed.positionY = Number(parsed.positionY);
  }
  if (parsed.rotation && typeof parsed.rotation === 'string') {
    parsed.rotation = Number(parsed.rotation);
  }
  // Empty label → null (use auto number as display fallback)
  if (typeof parsed.label === 'string' && parsed.label.trim() === '') {
    parsed.label = null;
  }
  const result = TableUpsertSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

export async function createTable(
  eventId: string,
  formData: FormData,
): Promise<UpsertTableState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to create tables' };
    }

    const validated = parseFormDataAsUpsert(formData);
    if (!validated) {
      const raw = Object.fromEntries(formData);
      const parsed: Record<string, unknown> = { ...raw };
      if (typeof parsed.capacity === 'string') parsed.capacity = Number(parsed.capacity);
      const issues = TableUpsertSchema.safeParse(parsed);
      const message = !issues.success
        ? (issues.error.issues[0]?.message ?? 'Invalid input')
        : 'Invalid input';
      return { success: false, message };
    }

    if (!validated.shape || !validated.capacity) {
      return { success: false, message: 'Shape and capacity are required' };
    }

    const supabase = await createClient();

    // Fetch existing tables once: used for both auto-place and next number
    const { data: existingRows } = await supabase
      .from('tables')
      .select('position_x, position_y, shape, table_number')
      .eq('event_id', eventId);

    // Auto-place if no explicit position
    let positionX = validated.positionX;
    let positionY = validated.positionY;
    if (positionX === undefined || positionY === undefined) {
      const existing = (existingRows ?? []).map((r) => ({
        positionX: r.position_x as number,
        positionY: r.position_y as number,
        shape: r.shape as TableApp['shape'],
      }));
      const placed = nextFreePosition(existing, validated.shape);
      positionX = placed.positionX;
      positionY = placed.positionY;
    }

    const dbData = TableAppToDbTransformerSchema.parse({
      ...validated,
      positionX,
      positionY,
    });

    // Compute next table_number (unique per event). One retry on race.
    const computeNextNumber = () => {
      const max = (existingRows ?? []).reduce(
        (m, r) => Math.max(m, (r.table_number as number) ?? 0),
        0,
      );
      return max + 1;
    };

    let insertAttempts = 0;
    let nextNumber = computeNextNumber();
    while (insertAttempts < 2) {
      const { data, error } = await supabase
        .from('tables')
        .insert({ ...dbData, event_id: eventId, table_number: nextNumber })
        .select('*')
        .single();

      if (!error) {
        const table = TableDbToAppTransformerSchema.parse(data);
        revalidatePath(`/app/${eventId}/seating`);
        return { success: true, message: 'Table created', table };
      }

      // 23505 = unique violation on (event_id, table_number) — race; refetch and retry once
      if (error.code === '23505' && insertAttempts === 0) {
        const { data: refetched } = await supabase
          .from('tables')
          .select('table_number')
          .eq('event_id', eventId);
        nextNumber =
          (refetched ?? []).reduce(
            (m, r) => Math.max(m, (r.table_number as number) ?? 0),
            0,
          ) + 1;
        insertAttempts += 1;
        continue;
      }

      console.error('Create table error:', error);
      return { success: false, message: 'Database error: Could not create table' };
    }

    return { success: false, message: 'Could not create table' };
  } catch (error) {
    console.error('Create table error:', error);
    return { success: false, message: 'Failed to create table' };
  }
}

export async function updateTable(
  eventId: string,
  formData: FormData,
): Promise<UpsertTableState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to update tables' };
    }

    const validated = parseFormDataAsUpsert(formData);
    if (!validated || !validated.id) {
      return { success: false, message: 'Table id is required' };
    }

    const dbData = TableAppToDbTransformerSchema.parse(validated);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tables')
      .update(dbData)
      .eq('id', validated.id)
      .eq('event_id', eventId)
      .select('*')
      .single();

    if (error) {
      console.error('Update table error:', error);
      return { success: false, message: 'Database error: Could not update table' };
    }

    const table = TableDbToAppTransformerSchema.parse(data);
    revalidatePath(`/app/${eventId}/seating`);
    return { success: true, message: 'Table updated', table };
  } catch (error) {
    console.error('Update table error:', error);
    return { success: false, message: 'Failed to update table' };
  }
}

export async function deleteTable(
  eventId: string,
  tableId: string,
): Promise<DeleteTableState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to delete tables' };
    }
    const supabase = await createClient();
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (error) {
      console.error('Delete table error:', error);
      return { success: false, message: 'Database error: Could not delete table' };
    }
    revalidatePath(`/app/${eventId}/seating`);
    return { success: true, message: 'Table deleted' };
  } catch (error) {
    console.error('Delete table error:', error);
    return { success: false, message: 'Failed to delete table' };
  }
}

export async function updateTablePosition(
  tableId: string,
  positionX: number,
  positionY: number,
): Promise<UpdatePositionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('tables')
      .update({ position_x: positionX, position_y: positionY })
      .eq('id', tableId);
    if (error) {
      console.error('Update position error:', error);
      return { success: false, message: 'Could not save position' };
    }
    return { success: true };
  } catch (error) {
    console.error('Update position error:', error);
    return { success: false, message: 'Failed to save position' };
  }
}
