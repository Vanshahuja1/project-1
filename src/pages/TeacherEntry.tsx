import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { User, Camera, CheckCircle, XCircle, Upload, Plus, Loader2 } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function TeacherEntry() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const [formData, setFormData] = useState({
    studentName: '',
    studentClass: '',
    rollNo: '',
    bloodGroup: '',
    dob: '',
    address: '',
    parentName: '',
    phone: '',
  });

  // Fetch link details
  const { data: linkData, isLoading, error } = useQuery({
    queryKey: ['teacher-link', token],
    queryFn: async () => {
      if (!token) throw new Error('Invalid link');
      
      const { data, error } = await supabase
        .from('teacher_data_links')
        .select('*, project:projects(name)')
        .eq('token', token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const isLinkValid = linkData?.is_active && linkData.current_submissions < linkData.max_submissions;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!linkData || !formData.studentName) {
        throw new Error('Please fill required fields');
      }

      let photoUrl = null;

      // Upload photo if provided
      if (photoFile) {
        setIsUploading(true);
        const fileName = `${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('teacher-uploads')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('teacher-uploads')
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
        setIsUploading(false);
      }

      // Submit data
      const { error } = await supabase
        .from('teacher_submissions')
        .insert({
          link_id: linkData.id,
          student_name: formData.studentName,
          student_photo_url: photoUrl,
          student_class: formData.studentClass || null,
          roll_no: formData.rollNo || null,
          blood_group: formData.bloodGroup || null,
          dob: formData.dob || null,
          address: formData.address || null,
          parent_name: formData.parentName || null,
          phone: formData.phone || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmissionComplete(true);
      toast.success('Student data submitted successfully!');
      // Reset form for next entry
      setTimeout(() => {
        setSubmissionComplete(false);
        setFormData({
          studentName: '',
          studentClass: '',
          rollNo: '',
          bloodGroup: '',
          dob: '',
          address: '',
          parentName: '',
          phone: '',
        });
        setPhotoFile(null);
        setPhotoPreview(null);
      }, 2000);
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast.error(error.message || 'Failed to submit data');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-destructive mb-2">Invalid Link</h1>
            <p className="text-muted-foreground">
              This link is invalid or has expired. Please contact your administrator for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLinkValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-orange-700 mb-2">
              {linkData.is_active ? 'Submission Limit Reached' : 'Link Disabled'}
            </h1>
            <p className="text-muted-foreground">
              {linkData.is_active 
                ? `This form has reached its maximum limit of ${linkData.max_submissions} submissions.`
                : 'This data entry link has been disabled by the administrator.'
              }
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Submissions: {linkData.current_submissions} / {linkData.max_submissions}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submissionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-green-700 mb-2">Submitted Successfully!</h1>
            <p className="text-muted-foreground">
              Student data has been recorded. You can add another student.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingSubmissions = linkData.max_submissions - linkData.current_submissions;
  const progressPercent = (linkData.current_submissions / linkData.max_submissions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Student Data Entry</CardTitle>
            <CardDescription>
              Teacher: {linkData.teacher_name}
              {linkData.project && (
                <span className="block mt-1">Project: {linkData.project.name}</span>
              )}
            </CardDescription>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Submissions</span>
                <span className="font-medium">{linkData.current_submissions} / {linkData.max_submissions}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">{remainingSubmissions} remaining</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Student Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-28 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center overflow-hidden bg-muted/20">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</p>
                </div>
              </div>
            </div>

            {/* Student Name */}
            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Class */}
              <div className="space-y-2">
                <Label>Class</Label>
                <Input
                  value={formData.studentClass}
                  onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                  placeholder="e.g., 10th A"
                />
              </div>

              {/* Roll No */}
              <div className="space-y-2">
                <Label>Roll No</Label>
                <Input
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  placeholder="e.g., 001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Blood Group */}
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Select 
                  value={formData.bloodGroup} 
                  onValueChange={(v) => setFormData({ ...formData, bloodGroup: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DOB */}
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                />
              </div>
            </div>

            {/* Parent Name */}
            <div className="space-y-2">
              <Label>Parent/Guardian Name</Label>
              <Input
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="Father's/Mother's name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contact number"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!formData.studentName || submitMutation.isPending || isUploading}
              className="w-full h-12 text-lg"
            >
              {submitMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isUploading ? 'Uploading Photo...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Submit Student Data
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Fields marked with * are required
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
