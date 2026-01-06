-- Create table for teacher data entry links
CREATE TABLE public.teacher_data_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  teacher_name text NOT NULL,
  teacher_email text,
  teacher_phone text,
  max_submissions integer NOT NULL DEFAULT 100,
  current_submissions integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for submissions from teachers
CREATE TABLE public.teacher_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.teacher_data_links(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_photo_url text,
  student_class text,
  roll_no text,
  blood_group text,
  dob date,
  address text,
  parent_name text,
  phone text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_data_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_data_links
CREATE POLICY "Super admins can manage all links" ON public.teacher_data_links
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Vendors can manage own links" ON public.teacher_data_links
FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- RLS Policies for teacher_submissions
CREATE POLICY "Super admins can view all submissions" ON public.teacher_submissions
FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Vendors can view own submissions" ON public.teacher_submissions
FOR SELECT USING (link_id IN (
  SELECT id FROM teacher_data_links WHERE vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  )
));

-- Public policy for teachers to submit data (no auth required for INSERT)
CREATE POLICY "Anyone can submit via valid link" ON public.teacher_submissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM teacher_data_links 
    WHERE id = link_id 
    AND is_active = true 
    AND current_submissions < max_submissions
  )
);

-- Create trigger to update submission count
CREATE OR REPLACE FUNCTION public.increment_submission_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE teacher_data_links 
  SET current_submissions = current_submissions + 1,
      updated_at = now()
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_teacher_submission
AFTER INSERT ON public.teacher_submissions
FOR EACH ROW
EXECUTE FUNCTION public.increment_submission_count();

-- Add updated_at trigger for teacher_data_links
CREATE TRIGGER update_teacher_data_links_updated_at
BEFORE UPDATE ON public.teacher_data_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for teacher photo uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-uploads', 'teacher-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for teacher uploads (public uploads allowed)
CREATE POLICY "Anyone can upload to teacher-uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'teacher-uploads');

CREATE POLICY "Anyone can view teacher-uploads" ON storage.objects
FOR SELECT USING (bucket_id = 'teacher-uploads');