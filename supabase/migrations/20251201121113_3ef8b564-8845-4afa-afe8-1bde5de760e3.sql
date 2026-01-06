-- Add photo processing status and metadata to data_records
ALTER TABLE public.data_records
ADD COLUMN IF NOT EXISTS original_photo_url text,
ADD COLUMN IF NOT EXISTS face_detected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS face_crop_coordinates jsonb,
ADD COLUMN IF NOT EXISTS background_removed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_error text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_data_records_project_id ON public.data_records(project_id);
CREATE INDEX IF NOT EXISTS idx_data_records_group_id ON public.data_records(group_id);
CREATE INDEX IF NOT EXISTS idx_data_records_processing_status ON public.data_records(processing_status);

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  false,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-photos bucket
CREATE POLICY "Users can upload project photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-photos'
  AND auth.uid() IN (
    SELECT user_id FROM public.vendors
    WHERE id IN (
      SELECT vendor_id FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can view own project photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-photos'
  AND auth.uid() IN (
    SELECT user_id FROM public.vendors
    WHERE id IN (
      SELECT vendor_id FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
    )
    UNION
    SELECT user_id FROM public.clients
    WHERE id IN (
      SELECT client_id FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can update own project photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-photos'
  AND auth.uid() IN (
    SELECT user_id FROM public.vendors
    WHERE id IN (
      SELECT vendor_id FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can delete own project photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-photos'
  AND auth.uid() IN (
    SELECT user_id FROM public.vendors
    WHERE id IN (
      SELECT vendor_id FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);

COMMENT ON COLUMN public.data_records.original_photo_url IS 'Original uploaded photo before processing';
COMMENT ON COLUMN public.data_records.photo_url IS 'Photo after face detection and cropping';
COMMENT ON COLUMN public.data_records.cropped_photo_url IS 'Photo after background removal';
COMMENT ON COLUMN public.data_records.processing_status IS 'pending, processing, completed, failed';