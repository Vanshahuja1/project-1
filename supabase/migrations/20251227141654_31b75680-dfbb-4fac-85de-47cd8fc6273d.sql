-- Create library_icons table for storing custom icons
CREATE TABLE public.library_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_icons ENABLE ROW LEVEL SECURITY;

-- Policies for library_icons
CREATE POLICY "Vendors can view their own icons and public icons"
ON public.library_icons
FOR SELECT
USING (vendor_id = (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()) OR is_public = true);

CREATE POLICY "Vendors can insert their own icons"
ON public.library_icons
FOR INSERT
WITH CHECK (vendor_id = (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));

CREATE POLICY "Vendors can update their own icons"
ON public.library_icons
FOR UPDATE
USING (vendor_id = (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));

CREATE POLICY "Vendors can delete their own icons"
ON public.library_icons
FOR DELETE
USING (vendor_id = (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));

-- Create storage bucket for icons
INSERT INTO storage.buckets (id, name, public) VALUES ('library-icons', 'library-icons', true) ON CONFLICT DO NOTHING;

-- Storage policies for library-icons bucket
CREATE POLICY "Public read access for library-icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'library-icons');

CREATE POLICY "Authenticated users can upload icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'library-icons' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'library-icons' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'library-icons' AND auth.role() = 'authenticated');