-- Replace the chat-session admin policy's inaccessible generic role helper
-- with a no-argument SECURITY DEFINER helper bound to auth.uid().
CREATE OR REPLACE FUNCTION public.chat_sessions_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT public.is_super_admin((SELECT auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
      );
$function$;
REVOKE ALL ON FUNCTION public.chat_sessions_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_sessions_is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins manage chat sessions" ON public.chat_sessions;
CREATE POLICY "Admins manage chat sessions"
ON public.chat_sessions
FOR ALL TO authenticated
USING (public.chat_sessions_is_admin())
WITH CHECK (public.chat_sessions_is_admin());
