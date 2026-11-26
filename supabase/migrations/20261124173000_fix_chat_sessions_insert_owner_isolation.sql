-- Restrict chat-session attribution at creation time.
-- Anonymous callers may create only anonymous sessions.
-- Authenticated callers may create anonymous sessions or sessions owned by themselves.
-- The existing admin ALL policy remains unchanged.
DROP POLICY IF EXISTS "Chat session creation" ON public.chat_sessions;

CREATE POLICY "Chat session creation"
ON public.chat_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR
    (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = (SELECT auth.uid())))
  )
);
