-- The function is trigger-only. Prevent direct execution through the exposed public RPC surface.
-- Existing AFTER INSERT triggers continue to invoke it.
REVOKE EXECUTE ON FUNCTION public.chatb2k_enqueue_talent_on_signup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chatb2k_enqueue_talent_on_signup() TO postgres, service_role;
