-- ============================================================================
-- Multi-Tenant Collaboration Schema
-- Run this script in the Supabase SQL Editor to add collaboration support.
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE public.collaborator_role AS ENUM ('owner', 'seating_manager');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE public.audit_action AS ENUM (
  'invited', 'accepted', 'declined', 'removed', 'role_changed', 'scope_changed'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Active collaborators on an event
CREATE TABLE public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role public.collaborator_role NOT NULL,
  is_creator boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Add FK to profiles so PostgREST can discover the relationship for joins
ALTER TABLE public.event_collaborators
  ADD CONSTRAINT event_collaborators_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Pending/resolved invitations
CREATE TABLE public.collaboration_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_email text NOT NULL,
  role public.collaborator_role NOT NULL,
  token text UNIQUE NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  scope_groups uuid[] DEFAULT '{}',
  scope_guests uuid[] DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Which guests/groups a seating manager can see
CREATE TABLE public.collaborator_guest_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.event_collaborators(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT scope_has_target CHECK (guest_id IS NOT NULL OR group_id IS NOT NULL),
  UNIQUE (collaborator_id, guest_id),
  UNIQUE (collaborator_id, group_id)
);

-- Audit trail
CREATE TABLE public.collaboration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  target_email text,
  action public.audit_action NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX idx_event_collaborators_event ON public.event_collaborators(event_id);
CREATE INDEX idx_event_collaborators_user ON public.event_collaborators(user_id);
CREATE INDEX idx_collab_invitations_token ON public.collaboration_invitations(token);
CREATE INDEX idx_collab_invitations_event ON public.collaboration_invitations(event_id);
CREATE INDEX idx_collab_guest_scope_collab ON public.collaborator_guest_scope(collaborator_id);
CREATE INDEX idx_audit_log_event ON public.collaboration_audit_log(event_id);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Returns true if the current user has any collaborator role on the event
CREATE OR REPLACE FUNCTION public.user_has_event_access(p_event_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_collaborators
    WHERE event_id = p_event_id AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns true if the current user is an owner of the event
CREATE OR REPLACE FUNCTION public.user_is_event_owner(p_event_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_collaborators
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Looks up an invitation by token, bypassing RLS.
-- Safe because tokens are unguessable UUIDs.
-- Returns the invitation row joined with the event title.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS json AS $$
  SELECT row_to_json(t) FROM (
    SELECT
      ci.*,
      e.title AS event_title
    FROM public.collaboration_invitations ci
    JOIN public.events e ON e.id = ci.event_id
    WHERE ci.token = p_token
    LIMIT 1
  ) t
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Accepts a collaboration invitation. Runs as SECURITY DEFINER to bypass RLS
-- since the invitee isn't yet a collaborator when they accept.
-- Validates token, status, expiry, and email match.
-- Inserts collaborator, copies scope, updates invitation, and logs the action.
CREATE OR REPLACE FUNCTION public.accept_collaboration_invitation(p_token text)
RETURNS json AS $$
DECLARE
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
  v_collaborator_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'You must be logged in.');
  END IF;

  v_user_email := auth.jwt() ->> 'email';

  -- Fetch invitation
  SELECT * INTO v_invitation
  FROM public.collaboration_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invitation not found.');
  END IF;

  -- Validate status
  IF v_invitation.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message',
      'This invitation has already been ' || v_invitation.status || '.');
  END IF;

  -- Validate not expired
  IF v_invitation.expires_at < now() THEN
    RETURN json_build_object('success', false, 'message', 'This invitation has expired.');
  END IF;

  -- Validate email matches
  IF v_invitation.invited_email != v_user_email THEN
    RETURN json_build_object('success', false, 'message',
      'This invitation was sent to a different email address.');
  END IF;

  -- Insert collaborator
  BEGIN
    INSERT INTO public.event_collaborators (event_id, user_id, role, is_creator)
    VALUES (v_invitation.event_id, v_user_id, v_invitation.role, false)
    RETURNING id INTO v_collaborator_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message',
      'You are already a collaborator on this event.');
  END;

  -- Copy scope from invitation if seating manager
  IF v_invitation.role = 'seating_manager' THEN
    -- Insert group scope entries
    IF v_invitation.scope_groups IS NOT NULL THEN
      INSERT INTO public.collaborator_guest_scope (collaborator_id, group_id)
      SELECT v_collaborator_id, unnest(v_invitation.scope_groups);
    END IF;

    -- Insert guest scope entries
    IF v_invitation.scope_guests IS NOT NULL THEN
      INSERT INTO public.collaborator_guest_scope (collaborator_id, guest_id)
      SELECT v_collaborator_id, unnest(v_invitation.scope_guests);
    END IF;
  END IF;

  -- Update invitation status
  UPDATE public.collaboration_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = v_invitation.id;

  -- Audit log
  INSERT INTO public.collaboration_audit_log (event_id, actor_id, target_email, action, metadata)
  VALUES (
    v_invitation.event_id,
    v_user_id,
    v_user_email,
    'accepted',
    json_build_object('role', v_invitation.role)::jsonb
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Invitation accepted! You now have access to this event.',
    'event_id', v_invitation.event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATED RLS POLICIES — EXISTING TABLES
-- ============================================================================

-- ---- events ----------------------------------------------------------------

-- Drop existing policies (common Supabase policy names — adjust if different)
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
-- Also drop any generic CRUD policies
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.events;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.events;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.events;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.events;

CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_has_event_access(id));

CREATE POLICY "events_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "events_update" ON public.events
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.user_is_event_owner(id));

CREATE POLICY "events_delete" ON public.events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.user_is_event_owner(id));

-- ---- guests ----------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can insert own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can update own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can delete own guests" ON public.guests;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.guests;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.guests;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.guests;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.guests;

CREATE POLICY "guests_select" ON public.guests
  FOR SELECT TO authenticated
  USING (
    -- Original owner
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    -- Co-owner collaborators
    OR EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.event_id = guests.event_id
        AND ec.user_id = auth.uid()
        AND ec.role = 'owner'
    )
    -- Seating managers with scope
    OR EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      JOIN public.collaborator_guest_scope cgs ON cgs.collaborator_id = ec.id
      WHERE ec.event_id = guests.event_id
        AND ec.user_id = auth.uid()
        AND ec.role = 'seating_manager'
        AND (cgs.guest_id = guests.id OR cgs.group_id = guests.group_id)
    )
  );

CREATE POLICY "guests_insert" ON public.guests
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "guests_update" ON public.guests
  FOR UPDATE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "guests_delete" ON public.guests
  FOR DELETE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

-- ---- groups ----------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can insert own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON public.groups;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.groups;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.groups;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.groups;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.groups;

CREATE POLICY "groups_select" ON public.groups
  FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_has_event_access(event_id)
  );

CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

-- ---- schedules -------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.schedules;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.schedules;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.schedules;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.schedules;

CREATE POLICY "schedules_select" ON public.schedules
  FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_has_event_access(event_id)
  );

CREATE POLICY "schedules_insert" ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "schedules_update" ON public.schedules
  FOR UPDATE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

CREATE POLICY "schedules_delete" ON public.schedules
  FOR DELETE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    OR public.user_is_event_owner(event_id)
  );

-- ============================================================================
-- 6. RLS POLICIES — NEW TABLES
-- ============================================================================

ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_guest_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_audit_log ENABLE ROW LEVEL SECURITY;

-- ---- event_collaborators ---------------------------------------------------

CREATE POLICY "ec_select" ON public.event_collaborators
  FOR SELECT TO authenticated
  USING (
    -- Owners of the event can see all collaborators
    public.user_is_event_owner(event_id)
    -- Or the event creator (user_id on events table)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    -- Or collaborators can see their own row
    OR user_id = auth.uid()
  );

CREATE POLICY "ec_insert" ON public.event_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

CREATE POLICY "ec_update" ON public.event_collaborators
  FOR UPDATE TO authenticated
  USING (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

CREATE POLICY "ec_delete" ON public.event_collaborators
  FOR DELETE TO authenticated
  USING (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- ---- collaboration_invitations ---------------------------------------------

CREATE POLICY "ci_select" ON public.collaboration_invitations
  FOR SELECT TO authenticated
  USING (
    -- Owners can see all invitations for their events
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    -- Anyone can look up by their own email (for accepting)
    OR invited_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "ci_insert" ON public.collaboration_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

CREATE POLICY "ci_update" ON public.collaboration_invitations
  FOR UPDATE TO authenticated
  USING (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
    -- Invitees can update their own invitation (accept/decline)
    OR invited_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "ci_delete" ON public.collaboration_invitations
  FOR DELETE TO authenticated
  USING (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- ---- collaborator_guest_scope ----------------------------------------------

CREATE POLICY "cgs_select" ON public.collaborator_guest_scope
  FOR SELECT TO authenticated
  USING (
    -- Owners can see scope
    EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.id = collaborator_guest_scope.collaborator_id
        AND (public.user_is_event_owner(ec.event_id)
             OR ec.event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()))
    )
    -- Seating managers can see their own scope
    OR EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.id = collaborator_guest_scope.collaborator_id
        AND ec.user_id = auth.uid()
    )
  );

CREATE POLICY "cgs_insert" ON public.collaborator_guest_scope
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.id = collaborator_guest_scope.collaborator_id
        AND (public.user_is_event_owner(ec.event_id)
             OR ec.event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "cgs_update" ON public.collaborator_guest_scope
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.id = collaborator_guest_scope.collaborator_id
        AND (public.user_is_event_owner(ec.event_id)
             OR ec.event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "cgs_delete" ON public.collaborator_guest_scope
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_collaborators ec
      WHERE ec.id = collaborator_guest_scope.collaborator_id
        AND (public.user_is_event_owner(ec.event_id)
             OR ec.event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()))
    )
  );

-- ---- collaboration_audit_log -----------------------------------------------

CREATE POLICY "cal_select" ON public.collaboration_audit_log
  FOR SELECT TO authenticated
  USING (
    public.user_is_event_owner(event_id)
    OR event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

CREATE POLICY "cal_insert" ON public.collaboration_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============================================================================
-- 7. AUTO-ADD EVENT CREATOR TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_add_event_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.event_collaborators (event_id, user_id, role, is_creator)
  VALUES (NEW.id, NEW.user_id, 'owner', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_add_event_creator
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_event_creator();

-- ============================================================================
-- 8. UPDATED_AT TRIGGER FOR EVENT_COLLABORATORS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if not already existing (safe to run)
DROP TRIGGER IF EXISTS set_updated_at ON public.event_collaborators;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.event_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. BACKFILL — Seed existing events into event_collaborators
-- ============================================================================

INSERT INTO public.event_collaborators (event_id, user_id, role, is_creator)
SELECT id, user_id, 'owner', true
FROM public.events
ON CONFLICT (event_id, user_id) DO NOTHING;
