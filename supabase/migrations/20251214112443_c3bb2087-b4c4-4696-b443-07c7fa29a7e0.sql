-- Allow vendors to view profiles of their staff members
CREATE POLICY "Vendors can view staff profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT vs.user_id 
    FROM vendor_staff vs
    WHERE vs.vendor_id IN (
      SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()
    )
  )
);

-- Allow vendors to view roles of their staff members  
CREATE POLICY "Vendors can view staff roles"
ON public.user_roles
FOR SELECT
USING (
  user_id IN (
    SELECT vs.user_id 
    FROM vendor_staff vs
    WHERE vs.vendor_id IN (
      SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()
    )
  )
);