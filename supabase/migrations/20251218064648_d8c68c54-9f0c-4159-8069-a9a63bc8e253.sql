-- Allow anyone to view active teacher links (needed for public entry form)
CREATE POLICY "Anyone can view active links by token"
ON public.teacher_data_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);