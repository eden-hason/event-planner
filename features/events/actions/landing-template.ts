'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { TEMPLATE_LIBRARY } from '@/features/templates/data/template-library';

export type UpdateLandingTemplateState = {
  success: boolean;
  message: string;
};

export async function updateEventLandingTemplate(
  eventId: string,
  templateId: string,
): Promise<UpdateLandingTemplateState> {
  if (!TEMPLATE_LIBRARY.some((t) => t.id === templateId)) {
    return { success: false, message: 'Invalid template' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({ landing_template_id: templateId })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating landing template:', error);
    return { success: false, message: 'Failed to save template selection' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/app/${eventId}/templates`);
  return { success: true, message: 'Template saved' };
}
