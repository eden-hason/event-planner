'use server';

import { createClient } from '@/lib/supabase/server';

const INVITATIONS_BUCKET = 'invitations';

/**
 * Extracts the storage path from a Supabase Storage public URL.
 *
 * @param url - The full public URL of the file
 * @param bucket - The bucket name to extract path from
 * @returns The path within the bucket, or null if invalid URL
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    // Supabase public URLs look like:
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return url.substring(markerIndex + marker.length);
  } catch {
    return null;
  }
}

/**
 * Deletes a file from Supabase Storage (server-side).
 *
 * @param bucket - The storage bucket name
 * @param path - The full path to the file within the bucket
 */
export async function deleteFromStorage(
  bucket: string,
  path: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Deletes an invitation image from storage by its public URL.
 *
 * @param url - The public URL of the invitation image
 */
export async function deleteInvitationImage(
  url: string,
): Promise<{ success: boolean; error: string | null }> {
  const path = extractStoragePath(url, INVITATIONS_BUCKET);

  if (!path) {
    console.error('Could not extract path from URL:', url);
    return { success: false, error: 'Invalid storage URL' };
  }

  return deleteFromStorage(INVITATIONS_BUCKET, path);
}
