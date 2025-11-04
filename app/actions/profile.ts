'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters'),
  avatar_url: z.string().url('Avatar URL must be a valid URL').optional(),
  initial_setup_complete: z.boolean().optional(),
});

export type ProfileUpdateData = z.infer<typeof ProfileUpdateSchema>;

export interface ProfileResult {
  success: boolean;
  message: string;
}

// Update current user's profile
export async function updateProfile(
  profileData: ProfileUpdateData,
): Promise<ProfileResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update your profile',
      };
    }

    // Validate data using Zod schema
    const validationResult = ProfileUpdateSchema.safeParse(profileData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;

    // TODO: Implement Supabase update
    console.log('updateProfile called with profileData:', validatedData);

    // Revalidate the profile page to show the updated profile
    revalidatePath('/profile');

    return {
      success: true,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      message: 'Failed to update profile. Please try again.',
    };
  }
}

// Update initial setup status
export async function updateInitialSetupStatus(
  isComplete: boolean,
): Promise<ProfileResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update your profile',
      };
    }

    // TODO: Implement Supabase update for initial_setup_complete
    console.log('updateInitialSetupStatus called with isComplete:', isComplete);

    // Revalidate the layout to show updated status
    revalidatePath('/');

    return {
      success: true,
      message: 'Setup status updated successfully',
    };
  } catch (error) {
    console.error('Update setup status error:', error);
    return {
      success: false,
      message: 'Failed to update setup status. Please try again.',
    };
  }
}
