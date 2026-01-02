'use server';

import { getCurrentUser } from '@/lib/auth';
import {
  GroupUpsertSchema,
  GroupAppToDbTransformerSchema,
} from '@/features/guests/schemas';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export type UpsertGroupState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof GroupUpsertSchema>>;
  message?: string | null;
};

export type DeleteGroupsState = {
  success: boolean;
  message: string;
  deletedCount?: number;
};

export type UpdateGroupMembersState = {
  success: boolean;
  message: string;
};

export async function upsertGroup(
  eventId: string,
  formData: FormData,
): Promise<UpsertGroupState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to upsert groups',
      };
    }

    const rawData = Object.fromEntries(formData);

    const validationResult = GroupUpsertSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = GroupAppToDbTransformerSchema.parse(validatedData);
    const supabase = await createClient();

    const { error } = await supabase.from('groups').upsert(
      {
        ...dbData,
        event_id: eventId,
      },
      {
        onConflict: 'id',
      },
    );

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not upsert group.',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);
    return {
      success: true,
      message: validatedData.id
        ? 'Group updated successfully.'
        : 'Group created successfully.',
    };
  } catch (error) {
    console.error('Upsert group error:', error);
    return {
      success: false,
      message: 'Failed to upsert group. Please try again.',
    };
  }
}

/**
 * Deletes one or more groups in a single database operation.
 * Uses PostgreSQL's IN clause for efficient batch deletion.
 *
 * @param eventId - The event ID for path revalidation and security
 * @param groupIds - Single group ID or array of group IDs to delete
 */
export async function deleteGroups(
  eventId: string,
  groupIds: string | string[],
): Promise<DeleteGroupsState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete groups',
      };
    }

    const ids = Array.isArray(groupIds) ? groupIds : [groupIds];

    if (ids.length === 0) {
      return {
        success: false,
        message: 'No groups selected for deletion',
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('groups')
      .delete()
      .in('id', ids)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error deleting groups:', error);
      return {
        success: false,
        message: 'Database error: Could not delete group(s)',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);

    const count = ids.length;
    return {
      success: true,
      message:
        count === 1
          ? 'Group deleted successfully'
          : `${count} groups deleted successfully`,
      deletedCount: count,
    };
  } catch (error) {
    console.error('Delete groups error:', error);
    return {
      success: false,
      message: 'Failed to delete group(s). Please try again',
    };
  }
}

/**
 * Updates the members of a group by setting/unsetting the group_id on guests.
 * Uses PostgreSQL batch updates for efficiency:
 * 1. Sets group_id = groupId for all guests that should be in the group
 * 2. Sets group_id = null for guests being removed from the group
 *
 * @param eventId - The event ID for path revalidation
 * @param groupId - The group ID to update
 * @param memberGuestIds - Array of guest IDs that should be members of this group
 * @param previousMemberIds - Array of guest IDs that were previously members (for removal)
 */
export async function updateGroupMembers(
  eventId: string,
  groupId: string,
  memberGuestIds: string[],
  previousMemberIds: string[],
): Promise<UpdateGroupMembersState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update group members',
      };
    }

    const supabase = await createClient();

    // Calculate guests to add and remove
    const guestsToAdd = memberGuestIds.filter(
      (id) => !previousMemberIds.includes(id),
    );
    const guestsToRemove = previousMemberIds.filter(
      (id) => !memberGuestIds.includes(id),
    );

    // Perform batch updates using PostgreSQL's efficient IN clause
    // Both operations are independent and can fail separately,
    // but we execute them sequentially for simplicity

    // Add guests to group (set group_id)
    if (guestsToAdd.length > 0) {
      const { error: addError } = await supabase
        .from('guests')
        .update({ group_id: groupId })
        .in('id', guestsToAdd)
        .eq('event_id', eventId);

      if (addError) {
        console.error('Error adding guests to group:', addError);
        return {
          success: false,
          message: 'Database error: Could not add guests to group',
        };
      }
    }

    // Remove guests from group (set group_id to null)
    if (guestsToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('guests')
        .update({ group_id: null })
        .in('id', guestsToRemove)
        .eq('event_id', eventId);

      if (removeError) {
        console.error('Error removing guests from group:', removeError);
        return {
          success: false,
          message: 'Database error: Could not remove guests from group',
        };
      }
    }

    revalidatePath(`/app/${eventId}/guests`);

    const addedCount = guestsToAdd.length;
    const removedCount = guestsToRemove.length;

    let message = 'Group members updated successfully.';
    if (addedCount > 0 && removedCount > 0) {
      message = `Added ${addedCount} and removed ${removedCount} guests`;
    } else if (addedCount > 0) {
      message = `Added ${addedCount} guest${addedCount > 1 ? 's' : ''} to group`;
    } else if (removedCount > 0) {
      message = `Removed ${removedCount} guest${removedCount > 1 ? 's' : ''} from group`;
    }

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error('Update group members error:', error);
    return {
      success: false,
      message: 'Failed to update group members. Please try again.',
    };
  }
}
