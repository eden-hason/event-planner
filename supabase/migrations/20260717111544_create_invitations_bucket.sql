-- Invitation images uploaded from the event details page.
-- Client uploads to `invitations/{eventId}/invitation-{timestamp}.{ext}` with upsert,
-- then stores the public URL on events.invitations.image_url.
--
-- The bucket is public because the stored URL is fetched unauthenticated by
-- WhatsApp/Twilio as a template IMAGE header (see whatsapp-templates.ts).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitations',
  'invitations',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Objects are foldered by event id, not by user id, so writes mirror the
-- events UPDATE policy: the legacy creator column, or an 'owner' collaborator.
-- A seating_manager collaborator cannot touch invitation images.
CREATE OR REPLACE FUNCTION public.user_can_manage_event_invitation(p_folder text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Folder name is client-supplied; a non-uuid must deny, not raise.
  BEGIN
    v_event_id := p_folder::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = v_event_id AND user_id = auth.uid()
  ) OR public.user_is_event_owner(v_event_id);
END;
$$;

CREATE POLICY "Invitation images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invitations');

CREATE POLICY "Event owners can upload invitation images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invitations'
    AND public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );

-- Required by the client's upsert: true.
CREATE POLICY "Event owners can update invitation images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'invitations'
    AND public.user_can_manage_event_invitation((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'invitations'
    AND public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );

CREATE POLICY "Event owners can delete invitation images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'invitations'
    AND public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );
