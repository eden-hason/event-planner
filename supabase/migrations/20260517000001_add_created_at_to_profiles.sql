ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE u.id = p.id;
