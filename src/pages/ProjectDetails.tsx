import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  Download, 
  FolderArchive, 
  Plus, 
  Pencil, 
  Crop, 
  Eraser, 
  RotateCcw, 
  Upload,
  MoreHorizontal,
  Eye,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Trash2,
  Printer,
  File,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ProjectGroupsManager } from '@/components/project/ProjectGroupsManager';
import { ProjectTemplateManager } from '@/components/project/ProjectTemplateManager';
import { GeneratePreviewDialog } from '@/components/project/GeneratePreviewDialog';
import { PDFGenerator } from '@/components/pdf/PDFGenerator';
import { AddDataDialog } from '@/components/project/AddDataDialog';
import { DataRecordsTable } from '@/components/project/DataRecordsTable';
import { EditRecordDialog } from '@/components/project/EditRecordDialog';
import { PhotoMatchDialog } from '@/components/project/PhotoMatchDialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';

// Project Tasks Tab Component
function ProjectTasksTab({ projectId, vendorId }: { projectId: string; vendorId?: string }) {
  const queryClient = useQueryClient();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    task_type: 'general',
    description: '',
    due_date: '',
    status: 'pending',
    assigned_to: ''
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks-tab', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch vendor staff for assignment
  const { data: staff = [] } = useQuery({
    queryKey: ['vendor-staff-tasks', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      // First get vendor staff
      const { data: staffData, error } = await supabase
        .from('vendor_staff')
        .select('user_id, role')
        .eq('vendor_id', vendorId)
        .eq('active', true);
      if (error) throw error;
      if (!staffData || staffData.length === 0) return [];
      
      // Then get profiles for those users
      const userIds = staffData.map(s => s.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      if (profileError) throw profileError;
      
      return staffData.map(s => {
        const profile = profiles?.find(p => p.id === s.user_id);
        return {
          id: s.user_id,
          full_name: profile?.full_name || 'Unknown',
          role: s.role
        };
      });
    },
    enabled: isAddingTask && !!vendorId,
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const { error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          title: taskData.title,
          task_type: taskData.task_type,
          description: taskData.description || null,
          due_date: taskData.due_date || null,
          status: taskData.status,
          assigned_to: taskData.assigned_to || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks-tab', projectId] });
      setIsAddingTask(false);
      setNewTask({ title: '', task_type: 'general', description: '', due_date: '', status: 'pending', assigned_to: '' });
      toast.success('Task added successfully');
    },
    onError: () => {
      toast.error('Failed to add task');
    }
  });

  const updateTaskStatus = async (taskId: string, status: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .update({ 
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update task');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['project-tasks-tab', projectId] });
    toast.success('Task updated');
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to delete task');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['project-tasks-tab', projectId] });
    toast.success('Task deleted');
  };

  return (
    <TabsContent value="tasks" className="mt-0 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>Create a new task for this project</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="data_entry">Data Entry</SelectItem>
                    <SelectItem value="printing">Printing</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={staff.length === 0 ? "No staff available" : "Select staff member"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} ({member.role.replace(/_/g, ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingTask(false)}>Cancel</Button>
              <Button 
                onClick={() => addTaskMutation.mutate(newTask)}
                disabled={!newTask.title || addTaskMutation.isPending}
              >
                {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading tasks...</CardContent></Card>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No tasks yet. Add your first task to get started.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && <p className="text-sm text-muted-foreground truncate max-w-[200px]">{task.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{task.task_type.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={task.status || 'pending'} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </TabsContent>
  );
}

// Project Files Tab Component
function ProjectFilesTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['project-files-tab', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .list(projectId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;

    setIsUploading(true);
    let uploaded = 0;

    for (const file of Array.from(uploadFiles)) {
      const fileName = `${projectId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('project-photos')
        .upload(fileName, file);

      if (!error) uploaded++;
    }

    toast.success(`Uploaded ${uploaded}/${uploadFiles.length} files`);
    setIsUploading(false);
    refetch();
    e.target.value = '';
  };

  const handleDeleteFile = async (fileName: string) => {
    const { error } = await supabase.storage
      .from('project-photos')
      .remove([`${projectId}/${fileName}`]);

    if (error) {
      toast.error('Failed to delete file');
      return;
    }
    toast.success('File deleted');
    refetch();
  };

  const getFileUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('project-photos')
      .getPublicUrl(`${projectId}/${fileName}`);
    return data.publicUrl;
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  return (
    <TabsContent value="files" className="mt-0 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Files</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileUpload}
          />
          <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading files...</CardContent></Card>
      ) : files.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No files uploaded yet. Upload files to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <Card key={file.name} className="overflow-hidden group">
              <div className="aspect-square bg-muted flex items-center justify-center relative">
                {isImage(file.name) ? (
                  <img 
                    src={getFileUrl(file.name)} 
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <File className="h-12 w-12 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" asChild>
                    <a href={getFileUrl(file.name)} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteFile(file.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate">{file.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addDataRef = useRef<HTMLButtonElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(name, institution_name, email, phone),
          product:products(name, category),
          groups:project_groups(
            *,
            template:templates(id, name, thumbnail_url, design_json, category)
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: records = [] } = useQuery({
    queryKey: ['project-records', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('data_records')
        .select('*')
        .eq('project_id', projectId)
        .order('record_number');

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates', project?.vendor_id],
    queryFn: async () => {
      if (!project?.vendor_id) return [];
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .or(`vendor_id.eq.${project.vendor_id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!project?.vendor_id,
  });

  // Download Excel
  const handleDownloadExcel = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }

    const excelData = records.map((record, index) => {
      const dataJson = record.data_json as Record<string, any>;
      return {
        'Sr No': index + 1,
        'Record Number': record.record_number,
        ...dataJson,
        'Photo URL': record.photo_url || '',
        'Status': record.processing_status || 'pending',
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `${project?.name || 'project'}_records.xlsx`);
    toast.success('Excel downloaded successfully');
  };

  // Download Image Zip
  const handleDownloadImageZip = async () => {
    const recordsWithPhotos = records.filter(r => r.photo_url);
    if (recordsWithPhotos.length === 0) {
      toast.error('No photos to download');
      return;
    }

    setIsProcessing(true);
    toast.info('Preparing image zip...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('photos');

      for (const record of recordsWithPhotos) {
        try {
          const response = await fetch(record.photo_url!);
          const blob = await response.blob();
          const dataJson = record.data_json as Record<string, any>;
          const fileName = `${record.record_number}_${dataJson.Name || dataJson.name || 'photo'}.jpg`;
          folder?.file(fileName, blob);
        } catch (err) {
          console.error('Failed to fetch photo:', record.photo_url);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'project'}_photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image zip downloaded');
    } catch (error) {
      toast.error('Failed to create zip file');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Image Auto Crop
  const handleAIAutoCrop = async () => {
    const recordsWithPhotos = records.filter(r => r.photo_url && !r.face_detected);
    if (recordsWithPhotos.length === 0) {
      toast.error('No photos need face detection');
      return;
    }

    setIsProcessing(true);
    toast.info(`Processing ${recordsWithPhotos.length} photos for face detection...`);

    try {
      const { detectAndCropFace } = await import('@/lib/faceDetection');
      let processed = 0;

      for (const record of recordsWithPhotos) {
        try {
          const result = await detectAndCropFace(record.photo_url!);
          if (result) {
            await supabase
              .from('data_records')
              .update({
                face_detected: true,
                cropped_photo_url: result.croppedImageUrl,
                face_crop_coordinates: result.coordinates,
                processing_status: 'processed',
              })
              .eq('id', record.id);
            processed++;
          }
        } catch (err) {
          console.error('Face detection failed for:', record.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success(`Face detection completed: ${processed}/${recordsWithPhotos.length} processed`);
    } catch (error) {
      toast.error('Face detection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Background Remover
  const handleAIBackgroundRemover = async () => {
    const recordsWithPhotos = records.filter(r => r.photo_url && !r.background_removed);
    if (recordsWithPhotos.length === 0) {
      toast.error('No photos need background removal');
      return;
    }

    setIsProcessing(true);
    toast.info(`Processing ${recordsWithPhotos.length} photos for background removal...`);

    try {
      const { removeBackground } = await import('@/lib/backgroundRemoval');
      let processed = 0;

      for (const record of recordsWithPhotos) {
        try {
          const result = await removeBackground(record.photo_url!);
          if (result) {
            const fileName = `${projectId}/${record.id}_bg_removed.png`;
            const response = await fetch(result);
            const blob = await response.blob();
            
            const { data: uploadData } = await supabase.storage
              .from('project-photos')
              .upload(fileName, blob, { upsert: true });

            if (uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('project-photos')
                .getPublicUrl(fileName);

              await supabase
                .from('data_records')
                .update({
                  background_removed: true,
                  photo_url: publicUrl,
                  original_photo_url: record.photo_url,
                  processing_status: 'processed',
                })
                .eq('id', record.id);
              processed++;
            }
          }
        } catch (err) {
          console.error('Background removal failed for:', record.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success(`Background removal completed: ${processed}/${recordsWithPhotos.length} processed`);
    } catch (error) {
      toast.error('Background removal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Photos
  const handleResetPhotos = async () => {
    const recordsWithOriginal = records.filter(r => r.original_photo_url);
    if (recordsWithOriginal.length === 0) {
      toast.error('No photos to reset');
      return;
    }

    setIsProcessing(true);

    try {
      for (const record of recordsWithOriginal) {
        await supabase
          .from('data_records')
          .update({
            photo_url: record.original_photo_url,
            original_photo_url: null,
            background_removed: false,
            face_detected: false,
            cropped_photo_url: null,
            processing_status: 'pending',
          })
          .eq('id', record.id);
      }

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success(`Reset ${recordsWithOriginal.length} photos to original`);
    } catch (error) {
      toast.error('Failed to reset photos');
    } finally {
      setIsProcessing(false);
    }
  };

  // Image Upload
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    toast.info(`Uploading ${files.length} photos...`);

    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const fileName = `${projectId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('project-photos')
          .upload(fileName, file);

        if (!error && data) {
          uploaded++;
        }
      } catch (err) {
        console.error('Upload failed:', file.name);
      }
    }

    toast.success(`Uploaded ${uploaded}/${files.length} photos`);
    setIsProcessing(false);
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-destructive">Project not found</div>
      </div>
    );
  }

  const projectInitial = project.name?.charAt(0)?.toUpperCase() || 'P';

  return (
    <main className="flex-1 bg-background">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Breadcrumb */}
      <div className="border-b px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span 
            className="hover:text-foreground cursor-pointer" 
            onClick={() => navigate('/projects')}
          >
            Projects
          </span>
          <span>›</span>
          <span className="text-foreground">Project Details</span>
        </div>
      </div>

      {/* Project Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 bg-primary/10 text-primary text-lg font-semibold">
              <AvatarFallback>{projectInitial}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground uppercase">{project.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Client : {project.client?.name || project.client?.institution_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(project.created_at), 'dd MMM yyyy hh:mm a')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
              {project.product?.category || 'General'}
            </Badge>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="templates" className="w-full">
        <div className="border-b px-6">
          <TabsList className="h-12 bg-transparent border-0 p-0 gap-6">
            <TabsTrigger 
              value="templates" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="print-orders" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              Print Orders
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              Project Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              Project Files
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-4 text-sm"
            >
              Project Data
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-0 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Templates & Groups</h2>
                <p className="text-sm text-muted-foreground">Manage templates and assign them to groups</p>
              </div>
              <GeneratePreviewDialog 
                projectId={projectId!}
                vendorId={project.vendor_id}
                groups={project.groups?.map(g => ({ 
                  id: g.id, 
                  name: g.name, 
                  template_id: g.template_id,
                  record_count: g.record_count || 0
                })) || []}
              />
            </div>
            
            <ProjectTemplateManager 
              vendorId={project.vendor_id} 
              projectId={projectId!}
            />
            
            <div className="border-t pt-6">
              <ProjectGroupsManager 
                projectId={projectId!} 
                groups={project.groups?.map(g => ({
                  id: g.id,
                  name: g.name,
                  template_id: g.template_id,
                  record_count: g.record_count || 0,
                  template: g.template
                })) || []}
              />
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {project.status?.replace(/_/g, ' ')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{records.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{project.groups?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{project.product?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{project.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">₹{Number(project.total_amount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-medium">₹{Number(project.paid_amount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="font-medium">{project.expected_delivery_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <p className="font-medium capitalize">{project.payment_status}</p>
                  </div>
                </div>
                {project.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Print Orders Tab */}
          <TabsContent value="print-orders" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Print Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className="text-lg font-semibold capitalize">{project.status?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Quantity</p>
                    <p className="text-lg font-semibold">{project.quantity}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="text-lg font-semibold">{project.expected_delivery_date || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Print Workflow Progress</h4>
                  <div className="flex flex-wrap gap-2">
                    {['draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing', 'dispatched', 'delivered'].map((status, idx) => {
                      const currentIdx = ['draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing', 'dispatched', 'delivered'].indexOf(project.status || 'draft');
                      const isComplete = idx <= currentIdx;
                      const isCurrent = status === project.status;
                      return (
                        <Badge 
                          key={status} 
                          variant={isComplete ? 'default' : 'outline'}
                          className={`capitalize ${isCurrent ? 'ring-2 ring-primary' : ''} ${isComplete ? 'bg-primary' : ''}`}
                        >
                          {status.replace(/_/g, ' ')}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Tasks Tab */}
          <ProjectTasksTab projectId={projectId!} vendorId={project?.vendor_id} />

          {/* Project Files Tab */}
          <ProjectFilesTab projectId={projectId!} />

          {/* Project Data Tab */}
          <TabsContent value="data" className="mt-0 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Data Records</h2>
              <div className="flex gap-2">
                <PhotoMatchDialog 
                  projectId={projectId!} 
                  records={records.map(r => ({
                    id: r.id,
                    record_number: r.record_number,
                    data_json: r.data_json as Record<string, any>,
                    photo_url: r.photo_url
                  }))}
                />
                <AddDataDialog projectId={projectId!} triggerRef={addDataRef} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background">
                    <DropdownMenuItem onClick={handleDownloadExcel}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadImageZip}>
                      <FolderArchive className="mr-2 h-4 w-4" />
                      Download Image Zip
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => addDataRef.current?.click()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Data
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info('Bulk Edit feature coming soon')}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Bulk Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleAIAutoCrop}>
                      <Crop className="mr-2 h-4 w-4" />
                      AI Image Auto Crop
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAIBackgroundRemover}>
                      <Eraser className="mr-2 h-4 w-4" />
                      AI Image Background Remover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleResetPhotos}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Photo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleImageUpload}>
                      <Upload className="mr-2 h-4 w-4" />
                      Image Upload
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <DataRecordsTable 
              records={records.map(r => ({
                id: r.id,
                record_number: r.record_number,
                group_id: r.group_id,
                processing_status: r.processing_status,
                data_json: r.data_json as Record<string, any>,
                photo_url: r.photo_url,
                original_photo_url: r.original_photo_url
              }))}
              projectId={projectId!}
              groups={project.groups?.map(g => ({ id: g.id, name: g.name })) || []}
              onEditRecord={(record) => setEditingRecord(record)}
            />
            
            <EditRecordDialog
              record={editingRecord}
              open={!!editingRecord}
              onOpenChange={(open) => !open && setEditingRecord(null)}
              projectId={projectId!}
            />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
