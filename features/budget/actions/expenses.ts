'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ExpenseUpsertSchema, ExpenseAppToDbTransformerSchema } from '../schemas/expenses';

export type UpsertExpenseState = {
  success: boolean;
  message?: string | null;
};

export type DeleteExpenseState = {
  success: boolean;
  message: string;
};

export async function upsertExpense(
  eventId: string,
  formData: FormData,
): Promise<UpsertExpenseState> {
  try {
    const raw = Object.fromEntries(formData);
    const parsedData = {
      id: raw.id as string | undefined,
      name: raw.name as string,
      emoji: (raw.emoji as string) || '💸',
      vendorName: (raw.vendorName as string) || null,
      vendorPhone: (raw.vendorPhone as string) || null,
      estimate: Number(raw.estimate) || 0,
      fullyPaid: raw.fullyPaid === 'true',
      hasAdvance: raw.hasAdvance === 'true',
      advanceAmount: Number(raw.advanceAmount) || 0,
      advancePaid: raw.advancePaid === 'true',
    };
    if (!parsedData.id) delete (parsedData as Record<string, unknown>).id;

    const validation = ExpenseUpsertSchema.safeParse(parsedData);
    if (!validation.success) {
      return { success: false, message: validation.error.issues[0]?.message };
    }

    const dbData = ExpenseAppToDbTransformerSchema.parse(validation.data);
    const supabase = await createClient();

    const { error } = await supabase
      .from('expenses')
      .upsert({ ...dbData, event_id: eventId }, { onConflict: 'id' });

    if (error) {
      console.error(error);
      return { success: false, message: 'Database error: Could not save expense.' };
    }

    revalidatePath(`/app/${eventId}/budget`);
    return {
      success: true,
      message: parsedData.id ? 'Expense updated.' : 'Expense added.',
    };
  } catch (error) {
    console.error('upsertExpense error:', error);
    return { success: false, message: 'Failed to save expense. Please try again.' };
  }
}

export async function deleteExpense(expenseId: string, eventId: string): Promise<DeleteExpenseState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

    if (error) {
      console.error(error);
      return { success: false, message: 'Database error: Could not delete expense.' };
    }

    revalidatePath(`/app/${eventId}/budget`);
    return { success: true, message: 'Expense deleted.' };
  } catch (error) {
    console.error('deleteExpense error:', error);
    return { success: false, message: 'Failed to delete expense. Please try again.' };
  }
}
