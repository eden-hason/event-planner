'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { DbToAppTransformerSchema, type EventApp } from '../schemas';
import { readEventTypeKey, readHostNames } from '../utils/event-title';
import { hasAnswered, resolveResumeStep } from '../utils/onboarding-progress';
import type { DraftEventResume } from '../types';

export async function getEventById(eventId: string): Promise<EventApp | null> {
  const { supabase } = await getEffectiveClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('*, event_types (key)')
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
 * Fetches the latest published event created by the current user.
 *
 * Drafts are excluded: a Draft Event is not a workspace and opening one would
 * land the user on a dashboard for an event that may have no date. `/app` looks
 * for a draft separately, via `getDraftEvent`, and routes back into onboarding.
 *
 * @returns The most recently created published event, or null if there is none.
 */
export async function getLastUserEvent(): Promise<EventApp | null> {
  try {
    const { supabase, impersonation } = await getEffectiveClient();

    let query = supabase
      .from('events')
      .select('*, event_types (key)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1);

    if (impersonation) {
      query = query.eq('user_id', impersonation.userId);
    }

    const { data: event, error } = await query.maybeSingle();

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

/**
 * Every event the user can open.
 *
 * Backs the event switcher, so drafts are excluded - a Draft Event does not
 * appear there and cannot be opened.
 */
export async function getAllUserEvents(): Promise<EventApp[]> {
  const { supabase, impersonation } = await getEffectiveClient();

  let query = supabase
    .from('events')
    .select('*, event_types (key)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (impersonation) {
    query = query.eq('user_id', impersonation.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching all user events:', error);
    return [];
  }

  return data.map((event) => DbToAppTransformerSchema.parse(event));
}

/**
 * The user's open Draft Event, if they have one.
 *
 * There is at most one: picking an event type retypes an existing draft rather
 * than opening a second. Returns everything the takeover needs to resume -
 * the answers so far, and the question to open on.
 */
export async function getDraftEvent(): Promise<DraftEventResume | null> {
  try {
    const { supabase, impersonation } = await getEffectiveClient();

    let query = supabase
      .from('events')
      .select(
        'id, title, event_date, location, guests_estimate, host_details, onboarding_step, event_types (key)',
      )
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1);

    if (impersonation) {
      query = query.eq('user_id', impersonation.userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching draft event:', error);
      return null;
    }
    if (!data) return null;

    const names = readHostNames(
      data.host_details as Record<string, unknown> | undefined,
    );
    const location = data.location as { name?: string } | null;

    return {
      eventId: data.id,
      eventType: readEventTypeKey(data.event_types) ?? '',
      title: data.title ?? '',
      ...names,
      eventDate: data.event_date ?? null,
      answeredDate: hasAnswered(data.onboarding_step, 'date'),
      locationName: location?.name || undefined,
      answeredVenue: hasAnswered(data.onboarding_step, 'venue'),
      guestsEstimate: data.guests_estimate ?? undefined,
      resumeAt: resolveResumeStep(data.onboarding_step),
    };
  } catch (error) {
    console.error('Error in getDraftEvent:', error);
    return null;
  }
}
