'use server';

import { createClient } from '@/utils/supabase/server';
import { DbToAppTransformerSchema, type EventApp } from '../schemas';

export async function getEventById(eventId: string): Promise<EventApp | null> {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event by id:', error);
    return null;
  }
  
  if (!event) {
    return null;
  }

  const transformedEvent = DbToAppTransformerSchema.parse(event);
  return transformedEvent;
}

/**
 * Fetches the latest event created by the current user.
 * @returns The most recently created event, or null if no events exist or user is not authenticated.
 */
export async function getLastUserEvent(): Promise<EventApp | null> {
  try {
    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching last user event:', error);
      return null;
    }

    if (!event) {
      return null;
    }

    // Transform DB data to App data using Zod transformer
    const transformedEvent = DbToAppTransformerSchema.parse(event);
    return transformedEvent;
  } catch (error) {
    console.error('Error in getLastUserEvent:', error);
    return null;
  }
}

export async function getAllUserEvents(): Promise<EventApp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching all user events:', error);
    return [];
  }
  return data;
}