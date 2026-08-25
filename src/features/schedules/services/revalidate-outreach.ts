import { revalidatePath } from 'next/cache';

/**
 * Every outreach mutation revalidates both surfaces, without exception.
 *
 * The Owner-side path must be the dynamic pattern including its `[locale]`
 * segment: a literal '/app' matches no route in this app and fails silently,
 * which leaves the couple looking at stale outreach state with nothing to
 * indicate it. 'layout' rather than 'page' because the schedules, dashboard and
 * guests pages all sit below that segment and all read this data.
 *
 * Lives in services/ rather than in either actions/ folder because the calls
 * and schedules features both call it, and it takes no client of its own.
 */
export function revalidateOutreach(eventId?: string) {
  revalidatePath('/[locale]/app/[eventId]', 'layout');
  // The Back Office is force-dynamic, so this is belt and braces - but it keeps
  // the rule true without exception rather than true-unless-someone-looks.
  revalidatePath('/admin', 'layout');
  if (eventId) revalidatePath(`/admin/events/${eventId}`);
}
