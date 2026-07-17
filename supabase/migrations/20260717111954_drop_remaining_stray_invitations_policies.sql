-- Two more dormant Studio-created policies on the `invitations` bucket, missed by
-- the previous migration because their names don't mention "invitation" - only
-- their bucket_id predicate does.
--
-- `Allow authenticated uploads 18l1j3u_0` was INSERT for any authenticated user
-- with_check `bucket_id = 'invitations'` and no ownership check, so it OR'd past
-- the scoped INSERT policy and allowed writing into any event's folder.
-- `Allow public read access 18l1j3u_0` duplicated the public-read policy exactly.
--
-- These only ever existed on the remote project; the drops are a no-op elsewhere.
DROP POLICY IF EXISTS "Allow authenticated uploads 18l1j3u_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access 18l1j3u_0" ON storage.objects;
