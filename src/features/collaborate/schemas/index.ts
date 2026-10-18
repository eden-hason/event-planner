import { z } from 'zod';

// ============================================================================
// Collaborator
// ============================================================================

const CollaboratorProfileDbSchema = z
  .object({
    email: z.string().nullable(),
    phone_number: z.string().nullable(),
    full_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  })
  .nullable();

export const CollaboratorDbToAppSchema = z
  .object({
    id: z.string().uuid(),
    event_id: z.string().uuid(),
    user_id: z.string().uuid(),
    is_creator: z.boolean(),
    created_at: z.string(),
    profiles: CollaboratorProfileDbSchema,
  })
  .transform((db) => {
    // Phone or email, whichever they signed in with; empty when unknown.
    const contact = db.profiles?.phone_number || db.profiles?.email || '';
    return {
      id: db.id,
      eventId: db.event_id,
      userId: db.user_id,
      isCreator: db.is_creator,
      // Full name when the profile has one, otherwise the contact.
      displayName: db.profiles?.full_name?.trim() || contact,
      contact,
      avatarUrl: db.profiles?.avatar_url ?? undefined,
      createdAt: db.created_at,
    };
  });

// Every collaborator is an Owner (ADR 0041), so a row carries no role. The
// creator is still told apart: they cannot be removed.
export type CollaboratorApp = z.output<typeof CollaboratorDbToAppSchema>;

// ============================================================================
// Action State
// ============================================================================

export type ActionState = {
  success: boolean;
  message?: string | null;
};
