import { createClient } from '@/utils/supabase/client';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Uploads a file directly to Supabase Storage from the client.
 * This avoids the 1MB server action body limit by uploading directly.
 *
 * @param file - The File to upload
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket (e.g., 'eventId/front-timestamp.png')
 * @returns The public URL of the uploaded file or an error
 */
export async function uploadToStorage(
  file: File,
  bucket: string,
  path: string,
): Promise<UploadResult> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { url: null, error: error.message };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Uploads an invitation image to Supabase Storage.
 * Generates a unique filename based on event ID and timestamp.
 *
 * @param file - The image file to upload
 * @param eventId - The event ID to organize uploads
 * @param type - 'front' or 'back' for the invitation side
 * @returns The public URL of the uploaded image or an error
 */
export async function uploadInvitationImage(
  file: File,
  eventId: string,
  type: 'front' | 'back',
): Promise<UploadResult> {
  // Generate unique filename
  const extension = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  const path = `${eventId}/${type}-${timestamp}.${extension}`;

  return uploadToStorage(file, 'invitations', path);
}
