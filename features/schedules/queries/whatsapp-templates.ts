'use server';

import { createClient } from '@/lib/supabase/server';
import { WhatsAppTemplateApp, WhatsAppTemplateDbToAppSchema } from '../schemas/whatsapp-templates';

/**
 * Fetch a single WhatsApp template by ID
 */
export async function getWhatsAppTemplateById(
  templateId: string,
): Promise<WhatsAppTemplateApp | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching WhatsApp template:', error);
    return null;
  }

  return data ? WhatsAppTemplateDbToAppSchema.parse(data) : null;
}

/**
 * Fetch multiple WhatsApp templates by IDs
 */
export async function getWhatsAppTemplatesByIds(
  templateIds: string[],
): Promise<Map<string, WhatsAppTemplateApp>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .in('id', templateIds);

  if (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return new Map();
  }

  const templateMap = new Map<string, WhatsAppTemplateApp>();
  data?.forEach((template) => {
    const parsed = WhatsAppTemplateDbToAppSchema.parse(template);
    templateMap.set(parsed.id, parsed);
  });

  return templateMap;
}
