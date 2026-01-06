-- Add RLS policy for super admin to create complaints for any vendor/client
CREATE POLICY "Super admins can manage all complaints" 
ON public.complaints 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));