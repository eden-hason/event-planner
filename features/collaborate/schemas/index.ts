import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const collaboratorRoles = ['owner', 'seating_manager'] as const;
export type CollaboratorRole = (typeof collaboratorRoles)[number];

export const invitationStatuses = [
  'pending',
  'accepted',
  'declined',
  'expired',
] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const ROLE_LABELS: Record<CollaboratorRole, string> = {
  owner: 'Owner',
  seating_manager: 'Seating Manager',
};

// ============================================================================
// Collaborator — App Schema
// ============================================================================

export const CollaboratorAppSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(collaboratorRoles),
  isCreator: z.boolean(),
  email: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
  scopeGroupCount: z.number().int().default(0),
  scopeGuestCount: z.number().int().default(0),
});

export type CollaboratorApp = z.infer<typeof CollaboratorAppSchema>;

// ============================================================================
// Collaborator — DB Schema
// ============================================================================

export const CollaboratorDbSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(collaboratorRoles),
  is_creator: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CollaboratorDb = z.infer<typeof CollaboratorDbSchema>;

// ============================================================================
// Invitation — App Schema
// ============================================================================

export const InvitationAppSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  invitedEmail: z.string(),
  role: z.enum(collaboratorRoles),
  token: z.string(),
  status: z.enum(invitationStatuses),
  scopeGroups: z.array(z.string().uuid()).default([]),
  scopeGuests: z.array(z.string().uuid()).default([]),
  expiresAt: z.string(),
  createdAt: z.string(),
  eventTitle: z.string().optional(),
});

export type InvitationApp = z.infer<typeof InvitationAppSchema>;

// ============================================================================
// Invitation — DB Schema & Transformer
// ============================================================================

export const InvitationDbSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  invited_by: z.string().uuid(),
  invited_email: z.string(),
  role: z.enum(collaboratorRoles),
  token: z.string(),
  status: z.enum(invitationStatuses),
  scope_groups: z.array(z.string().uuid()).nullable().default([]),
  scope_guests: z.array(z.string().uuid()).nullable().default([]),
  expires_at: z.string(),
  responded_at: z.string().nullable(),
  created_at: z.string(),
});

export type InvitationDb = z.infer<typeof InvitationDbSchema>;

export const InvitationDbToAppSchema = InvitationDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  invitedBy: db.invited_by,
  invitedEmail: db.invited_email,
  role: db.role,
  token: db.token,
  status: db.status,
  scopeGroups: db.scope_groups ?? [],
  scopeGuests: db.scope_guests ?? [],
  expiresAt: db.expires_at,
  createdAt: db.created_at,
}));

// ============================================================================
// Scope Item — App Schema
// ============================================================================

export const ScopeItemSchema = z.object({
  id: z.string().uuid(),
  collaboratorId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
});

export type ScopeItem = z.infer<typeof ScopeItemSchema>;

// ============================================================================
// Form / Action Schemas
// ============================================================================

export const InviteFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(collaboratorRoles, {
    message: 'Please select a role',
  }),
  scopeGroups: z.array(z.string().uuid()).default([]),
  scopeGuests: z.array(z.string().uuid()).default([]),
});

export type InviteFormData = z.infer<typeof InviteFormSchema>;

export const UpdateScopeFormSchema = z.object({
  collaboratorId: z.string().uuid(),
  scopeGroups: z.array(z.string().uuid()).default([]),
  scopeGuests: z.array(z.string().uuid()).default([]),
});

export type UpdateScopeFormData = z.infer<typeof UpdateScopeFormSchema>;

// ============================================================================
// Action State
// ============================================================================

export type ActionState = {
  success: boolean;
  message?: string | null;
  invitationLink?: string | null;
};
