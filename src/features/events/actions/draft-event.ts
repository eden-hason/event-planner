'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  DraftDateSchema,
  DraftEstimateSchema,
  DraftLocationSchema,
  DraftNamesSchema,
  EventTypeKeySchema,
  type CreateDraftEventState,
  type DraftStepState,
  type EventTypeKey,
} from '../schemas';
import {
  buildEventTitle,
  buildHostDetails,
  readEventTypeKey,
  readHostNames,
} from '../utils/event-title';
import type { OnboardingStep } from '../types';

/**
 * Server Actions behind the onboarding takeover.
 *
 * Every one of these patches a single Draft Event that already exists - the row
 * is created the moment the couple picks an event type, and each answer after
 * that is an update. Nothing here blocks a screen transition: the takeover
 * moves on optimistically and these save behind it, which is why each returns a
 * plain state object rather than throwing.
 *
 * See docs/adr/0003-events-exist-before-they-are-complete.md.
 */

/** Records how far onboarding got, without ever moving the marker backwards. */
const STEP_ORDER: readonly OnboardingStep[] = [
  'type',
  'names',
  'date',
  'venue',
  'estimate',
];

function furthestStep(
  current: string | null | undefined,
  reached: OnboardingStep,
): OnboardingStep {
  const currentIdx = STEP_ORDER.indexOf(current as OnboardingStep);
  const reachedIdx = STEP_ORDER.indexOf(reached);
  return currentIdx > reachedIdx ? (current as OnboardingStep) : reached;
}

/**
 * Loads the draft and checks it is one - a published event must never be
 * patched by an onboarding screen, and RLS already guarantees it is the caller's.
 */
async function loadDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
) {
  const { data, error } = await supabase
    .from('events')
    .select('id, status, onboarding_step, host_details, event_types (key)')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) return { draft: null, message: 'Event not found' };
  if (data.status !== 'draft') {
    return { draft: null, message: 'This event has already been created' };
  }
  return { draft: data, message: null };
}

async function resolveEventTypeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventTypeKey: EventTypeKey,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('event_types')
    .select('id')
    .eq('key', eventTypeKey)
    .single();

  if (error || !data) {
    console.error('Error resolving event type:', eventTypeKey, error);
    return null;
  }
  return data.id;
}

/**
 * Creates the Draft Event, or retypes the existing one.
 *
 * Picking a type is the first answer, and the point from which the event
 * exists. Going back and picking a different type retypes the draft in place
 * rather than starting a second one, so abandoning and returning never leaves a
 * trail of half-events behind one user.
 */
export async function createDraftEvent(
  eventType: string,
): Promise<CreateDraftEventState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to create events' };
    }

    const parsed = EventTypeKeySchema.safeParse(eventType);
    if (!parsed.success) {
      return { success: false, message: 'Unknown event type' };
    }

    const supabase = await createClient();
    const eventTypeId = await resolveEventTypeId(supabase, parsed.data);
    if (!eventTypeId) return { success: false, message: 'Unknown event type' };

    // Retype the draft in place if one is already open.
    const { data: existing } = await supabase
      .from('events')
      .select('id, host_details')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // The title is derived from the type, so retyping has to rebuild it from
      // whatever names were already given - otherwise a couple who backs up and
      // switches from wedding to henna keeps a title saying "The Wedding of".
      const locale = await getLocale();
      const names = readHostNames(
        existing.host_details as Record<string, unknown> | undefined,
      );
      const title = buildEventTitle(parsed.data, names, locale);

      const { error } = await supabase
        .from('events')
        .update({
          event_type_id: eventTypeId,
          title,
          host_details: buildHostDetails(parsed.data, names),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error retyping draft event:', error);
        return { success: false, message: 'Failed to save your choice' };
      }
      return { success: true, message: null, eventId: existing.id };
    }

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        user_id: currentUser.id,
        event_type_id: eventTypeId,
        status: 'draft',
        onboarding_step: 'type',
        // title defaults to '' and event_date stays null until those screens.
      })
      .select('id')
      .single();

    if (error || !newEvent) {
      console.error('Error creating draft event:', error);
      return { success: false, message: 'Failed to create your event' };
    }

    return { success: true, message: null, eventId: newEvent.id };
  } catch (error) {
    console.error('Create draft event error:', error);
    return { success: false, message: 'Failed to create your event' };
  }
}

/**
 * Saves the host names and regenerates the title from them.
 *
 * The title is never an editable field: it is built from these names every time
 * they change, so it cannot drift from `host_details`.
 */
export async function setDraftNames(
  input: unknown,
): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  const parsed = DraftNamesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }
  const { eventId, ...names } = parsed.data;

  try {
    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const eventType = readEventTypeKey(draft.event_types) as
      | EventTypeKey
      | undefined;
    if (!eventType) {
      return { success: false, message: 'This event has no type yet' };
    }

    const locale = await getLocale();
    const { error } = await supabase
      .from('events')
      .update({
        title: buildEventTitle(eventType, names, locale),
        host_details: buildHostDetails(eventType, names),
        onboarding_step: furthestStep(draft.onboarding_step, 'names'),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error saving draft names:', error);
      return { success: false, message: 'Failed to save the names' };
    }
    return { success: true, message: null };
  } catch (error) {
    console.error('Set draft names error:', error);
    return { success: false, message: 'Failed to save the names' };
  }
}

/**
 * Saves the event date, or records that there is not one yet.
 *
 * An empty `eventDate` is the "we don't have a date yet" answer, and is as valid
 * an answer as a date. It stores null and still advances `onboarding_step`, so
 * resuming does not ask again.
 */
export async function setDraftDate(input: unknown): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  const parsed = DraftDateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }
  const { eventId, eventDate } = parsed.data;

  const trimmed = eventDate.trim();
  if (trimmed) {
    const asDate = new Date(trimmed);
    if (Number.isNaN(asDate.getTime())) {
      return { success: false, message: 'That is not a valid date' };
    }
    // Compared against the start of today so choosing today is allowed.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (asDate < startOfToday) {
      return { success: false, message: 'That date has already passed' };
    }
  }

  try {
    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const { error } = await supabase
      .from('events')
      .update({
        event_date: trimmed || null,
        onboarding_step: furthestStep(draft.onboarding_step, 'date'),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error saving draft date:', error);
      return { success: false, message: 'Failed to save the date' };
    }
    return { success: true, message: null };
  } catch (error) {
    console.error('Set draft date error:', error);
    return { success: false, message: 'Failed to save the date' };
  }
}

/**
 * Saves the venue, or records that one has not been booked.
 *
 * As with the date, omitting the location is an answer rather than a gap.
 */
export async function setDraftLocation(
  input: unknown,
): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  const parsed = DraftLocationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }
  const { eventId, location } = parsed.data;

  try {
    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const { error } = await supabase
      .from('events')
      .update({
        location: location ?? null,
        onboarding_step: furthestStep(draft.onboarding_step, 'venue'),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error saving draft location:', error);
      return { success: false, message: 'Failed to save the venue' };
    }
    return { success: true, message: null };
  } catch (error) {
    console.error('Set draft location error:', error);
    return { success: false, message: 'Failed to save the venue' };
  }
}

/**
 * Saves the guest-record estimate from the slider.
 *
 * Only the count is stored. The channel the couple toyed with, and the price it
 * implied, are deliberately not saved - that choice is re-made at payment time
 * and is not a commitment here.
 */
export async function setDraftEstimate(
  input: unknown,
): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  const parsed = DraftEstimateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }
  const { eventId, guestsEstimate } = parsed.data;

  try {
    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const { error } = await supabase
      .from('events')
      .update({
        guests_estimate: guestsEstimate,
        onboarding_step: furthestStep(draft.onboarding_step, 'estimate'),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error saving draft estimate:', error);
      return { success: false, message: 'Failed to save the estimate' };
    }
    return { success: true, message: null };
  } catch (error) {
    console.error('Set draft estimate error:', error);
    return { success: false, message: 'Failed to save the estimate' };
  }
}

/**
 * Completes onboarding: the Draft Event becomes a real one.
 *
 * This is the only way out of the draft state, and the point at which the event
 * gains a workspace and appears in the event switcher.
 */
export async function publishDraftEvent(
  eventId: string,
): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }

    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const { error } = await supabase
      .from('events')
      .update({ status: 'published', is_default: true })
      .eq('id', eventId);

    if (error) {
      console.error('Error publishing draft event:', error);
      return { success: false, message: 'Failed to finish creating your event' };
    }

    // The freshly published event becomes the one the app opens by default.
    await supabase
      .from('events')
      .update({ is_default: false })
      .eq('user_id', currentUser.id)
      .neq('id', eventId);

    revalidatePath('/app');
    revalidatePath(`/app/${eventId}/dashboard`);

    return { success: true, message: null };
  } catch (error) {
    console.error('Publish draft event error:', error);
    return { success: false, message: 'Failed to finish creating your event' };
  }
}

/**
 * Discards an abandoned Draft Event.
 *
 * Not part of the flow itself - onboarding never deletes what the couple
 * answered. This exists for the back office, where an abandoned draft is a
 * record of interest someone may decide to clear.
 */
export async function discardDraftEvent(
  eventId: string,
): Promise<DraftStepState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  try {
    const supabase = await createClient();
    const { draft, message } = await loadDraft(supabase, eventId);
    if (!draft) return { success: false, message };

    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      console.error('Error discarding draft event:', error);
      return { success: false, message: 'Failed to discard the draft' };
    }

    revalidatePath('/app');
    return { success: true, message: null };
  } catch (error) {
    console.error('Discard draft event error:', error);
    return { success: false, message: 'Failed to discard the draft' };
  }
}
