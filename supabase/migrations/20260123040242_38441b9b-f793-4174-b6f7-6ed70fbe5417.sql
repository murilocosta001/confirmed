-- Remove UPDATE policy from subscriptions - only backend/service role can update
DROP POLICY IF EXISTS "Users can update their clinic subscription" ON public.subscriptions;

-- Ensure SELECT-only policy remains (read-only for users)
-- The existing SELECT policy is already correct

-- Add comment to document security model
COMMENT ON TABLE public.subscriptions IS 'Subscriptions are managed exclusively by Stripe webhooks. Users have read-only access.';