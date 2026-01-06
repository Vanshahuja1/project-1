-- Fix: Overly permissive notifications INSERT policy
-- Remove the policy that allows anyone to insert notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a new restrictive policy that only allows service_role to insert notifications
-- This ensures notifications can only be created from edge functions/backend
CREATE POLICY "Service role can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');