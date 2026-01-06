-- Create library_fonts table for storing custom fonts that can be shared
CREATE TABLE public.library_fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  font_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library_shapes table for storing custom shapes that can be shared
CREATE TABLE public.library_shapes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shape_url TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_shapes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_fonts
CREATE POLICY "Vendors can view own fonts"
ON public.library_fonts FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can insert own fonts"
ON public.library_fonts FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update own fonts"
ON public.library_fonts FOR UPDATE
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete own fonts"
ON public.library_fonts FOR DELETE
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Public fonts viewable by all authenticated users"
ON public.library_fonts FOR SELECT
USING (is_public = true);

-- RLS Policies for library_shapes
CREATE POLICY "Vendors can view own shapes"
ON public.library_shapes FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can insert own shapes"
ON public.library_shapes FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update own shapes"
ON public.library_shapes FOR UPDATE
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete own shapes"
ON public.library_shapes FOR DELETE
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Public shapes viewable by all authenticated users"
ON public.library_shapes FOR SELECT
USING (is_public = true);