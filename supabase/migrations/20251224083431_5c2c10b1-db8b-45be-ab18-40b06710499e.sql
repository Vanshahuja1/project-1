-- Create storage buckets for fonts and shapes if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-fonts', 'library-fonts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('library-shapes', 'library-shapes', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload fonts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload shapes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view fonts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view shapes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their fonts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their shapes" ON storage.objects;

-- Allow authenticated users to upload to library-fonts bucket
CREATE POLICY "Authenticated users can upload fonts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'library-fonts');

-- Allow authenticated users to upload to library-shapes bucket
CREATE POLICY "Authenticated users can upload shapes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'library-shapes');

-- Allow public read access to fonts
CREATE POLICY "Public can view fonts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'library-fonts');

-- Allow public read access to shapes
CREATE POLICY "Public can view shapes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'library-shapes');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete their fonts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'library-fonts');

CREATE POLICY "Authenticated users can delete their shapes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'library-shapes');