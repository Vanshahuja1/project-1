-- Create vendor_staff table to link staff members to vendors
CREATE TABLE public.vendor_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'vendor_staff',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Enable RLS
ALTER TABLE public.vendor_staff ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own staff
CREATE POLICY "Vendors can view own staff"
ON public.vendor_staff
FOR SELECT
USING (
  vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);

-- Vendors can manage their own staff
CREATE POLICY "Vendors can manage own staff"
ON public.vendor_staff
FOR ALL
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Super admins can manage all vendor staff
CREATE POLICY "Super admins can manage all vendor staff"
ON public.vendor_staff
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_vendor_staff_updated_at
BEFORE UPDATE ON public.vendor_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();