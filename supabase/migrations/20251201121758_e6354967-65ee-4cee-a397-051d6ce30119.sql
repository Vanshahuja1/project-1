-- Create storage bucket for generated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-pdfs', 'generated-pdfs', true);

-- RLS policies for generated-pdfs bucket
CREATE POLICY "Users can upload generated PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-pdfs' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can view own generated PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-pdfs' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can delete own generated PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-pdfs' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Public access to generated PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-pdfs');