-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Master vendors can view sub-vendors" ON public.vendors;

-- Create a security definer function to check if user is master vendor of a specific vendor
CREATE OR REPLACE FUNCTION public.is_master_vendor_of(check_vendor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors master
    JOIN public.vendors sub ON sub.parent_vendor_id = master.id
    WHERE master.user_id = auth.uid()
    AND sub.id = check_vendor_id
  )
$$;

-- Create new non-recursive policy using the security definer function
CREATE POLICY "Master vendors can view sub-vendors" ON public.vendors 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_master_vendor_of(id)
);