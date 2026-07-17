-- Two policies were created in the Studio UI against an `invitations` bucket that
-- never existed, so they sat dormant until the previous migration created it.
-- The DELETE one granted every authenticated user delete on every event's image
-- (qual: bucket_id = 'invitations', with no ownership check). Permissive policies
-- are OR'd, so it defeated the ownership check the previous migration added.
-- Its SELECT twin was redundant with the public-read policy.
--
-- These only ever existed on the remote project; the drops are a no-op elsewhere.
DROP POLICY IF EXISTS "Authenticated users can delete from invitations 18l1j3u_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from invitations 18l1j3u_1" ON storage.objects;
