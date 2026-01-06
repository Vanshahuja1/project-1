-- Create storage policies for project-photos bucket
-- Allow authenticated users to upload to project folders they own (via vendor)
CREATE POLICY "Vendors can upload project photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN vendors v ON p.vendor_id = v.id
    WHERE v.user_id = auth.uid()
  )
);

-- Allow authenticated users to update their project photos
CREATE POLICY "Vendors can update project photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN vendors v ON p.vendor_id = v.id
    WHERE v.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their project photos
CREATE POLICY "Vendors can delete project photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN vendors v ON p.vendor_id = v.id
    WHERE v.user_id = auth.uid()
  )
);

-- Allow anyone to view project photos (bucket is public)
CREATE POLICY "Anyone can view project photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-photos');