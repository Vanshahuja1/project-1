-- Create a table for custom masks library
CREATE TABLE public.custom_masks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mask_url TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_masks ENABLE ROW LEVEL SECURITY;

-- Policies for vendor access
CREATE POLICY "Vendors can view own masks"
ON public.custom_masks
FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can insert own masks"
ON public.custom_masks
FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete own masks"
ON public.custom_masks
FOR DELETE
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Public masks viewable by all"
ON public.custom_masks
FOR SELECT
USING (is_public = true);

-- Trigger for updated_at
CREATE TRIGGER update_custom_masks_updated_at
BEFORE UPDATE ON public.custom_masks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();