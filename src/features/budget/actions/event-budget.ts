'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SetEventBudgetState = {
  success: boolean;
  message?: string | null;
};

export async function setEventBudget(
  eventId: string,
  formData: FormData,
): Promise<SetEventBudgetState> {
  const raw = formData.get('budget');
  const budget = Number(raw);

  if (!raw || isNaN(budget) || budget <= 0) {
    return { success: false, message: 'Please enter a valid budget amount.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ budget })
    .eq('id', eventId);

  if (error) {
    console.error('setEventBudget error:', error);
    return { success: false, message: 'Failed to save budget. Please try again.' };
  }

  revalidatePath(`/app/${eventId}/budget`);
  return { success: true, message: 'Budget saved.' };
}

export async function removeEventBudget(eventId: string): Promise<SetEventBudgetState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ budget: null })
    .eq('id', eventId);

  if (error) {
    console.error('removeEventBudget error:', error);
    return { success: false, message: 'Failed to remove budget. Please try again.' };
  }

  revalidatePath(`/app/${eventId}/budget`);
  return { success: true, message: 'Budget removed.' };
}
