
-- 1. Tighten models SELECT: only owner + admin see full row
DROP POLICY IF EXISTS "Approved models viewable by authenticated users" ON public.models;

CREATE POLICY "Owner or admin can read full model row"
  ON public.models FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Public view that exposes only safe columns for marketplace/profile browsing
DROP VIEW IF EXISTS public.models_public;
CREATE VIEW public.models_public
WITH (security_invoker = on) AS
  SELECT
    id, user_id, full_name, age, gender, city, state,
    instagram, tiktok, bio, score, category, ig_followers,
    status, created_at, updated_at
  FROM public.models
  WHERE status = 'approved';

GRANT SELECT ON public.models_public TO authenticated, anon;

-- 3. user_roles: one role per user — prevent privilege escalation by stacking roles
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_per_user ON public.user_roles (user_id);

DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
CREATE POLICY "Users insert their single non-admin role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = ANY (ARRAY['model'::app_role, 'brand'::app_role])
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

-- 4. Storage: explicit UPDATE policy on model-photos scoped to owner folder
DROP POLICY IF EXISTS "Owners update own photos" ON storage.objects;
CREATE POLICY "Owners update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'model-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'model-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. has_role: revoke direct EXECUTE from clients (still callable inside SECURITY DEFINER context of RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
