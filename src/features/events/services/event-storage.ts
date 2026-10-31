import type { SupabaseClient } from '@supabase/supabase-js';

/** Buckets whose files are foldered by Event id: `<eventId>/<file>` */
const EVENT_FOLDER_BUCKETS = ['invitations', 'invitation-videos'] as const;

/**
 * Removes every file an Event left in storage, once the Event itself is gone.
 *
 * Deleting the events row cascades through every table, but storage is not a
 * table, so the invitation images and Bespoke video stayed behind - every test
 * Event ever deleted on production had. This has to run on a service client:
 * the bucket policies ask user_can_manage_event_invitation, which is false for
 * an Event that no longer exists, so the Owner's own client may not remove
 * them. Callers run it only after their own delete went through under RLS,
 * which is what proves the Owner had the right to.
 *
 * Best effort: a file left behind costs a few hundred KB, not a broken delete,
 * so failures are logged and never thrown.
 */
export async function removeEventStorage(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  await Promise.all(
    EVENT_FOLDER_BUCKETS.map(async (bucket) => {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(eventId, { limit: 1000 });
        if (listError) throw listError;
        if (!files?.length) return;

        const { error } = await supabase.storage
          .from(bucket)
          .remove(files.map((file) => `${eventId}/${file.name}`));
        if (error) throw error;
      } catch (error) {
        console.error(`Failed to remove ${bucket} files for event ${eventId}:`, error);
      }
    }),
  );
}
