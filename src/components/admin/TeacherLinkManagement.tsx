import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, Link, Copy, Eye, Trash2, RefreshCcw, 
  Users, ExternalLink, ToggleLeft, Check
} from 'lucide-react';

export function TeacherLinkManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [newLink, setNewLink] = useState({
    teacherName: '',
    teacherEmail: '',
    teacherPhone: '',
    maxSubmissions: 100,
    projectId: '',
    vendorId: '',
  });

  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const queryClient = useQueryClient();

  // Get vendor ID for current user
  const { data: vendorData } = useQuery({
    queryKey: ['vendor-for-user', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all teacher links
  const { data: links = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-data-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_data_links')
        .select(`
          *,
          project:projects(name, project_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Fetch all vendors for super_admin dropdown
  const { data: allVendors = [] } = useQuery({
    queryKey: ['all-vendors-for-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('active', true)
        .order('business_name');

      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch submissions for a link
  const { data: submissions = [] } = useQuery({
    queryKey: ['teacher-submissions', selectedLinkId],
    queryFn: async () => {
      if (!selectedLinkId) return [];
      const { data, error } = await supabase
        .from('teacher_submissions')
        .select('*')
        .eq('link_id', selectedLinkId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedLinkId,
  });

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      // For super_admin, use selected vendor; otherwise use current user's vendor
      const selectedVendorId = isSuperAdmin ? newLink.vendorId : vendorData?.id;
      
      if (!selectedVendorId || !user) {
        throw new Error(isSuperAdmin ? 'Please select a vendor' : 'Vendor not found');
      }

      // Generate unique token
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      const { error } = await supabase
        .from('teacher_data_links')
        .insert({
          token,
          teacher_name: newLink.teacherName,
          teacher_email: newLink.teacherEmail || null,
          teacher_phone: newLink.teacherPhone || null,
          max_submissions: newLink.maxSubmissions,
          project_id: newLink.projectId && newLink.projectId !== 'none' ? newLink.projectId : null,
          vendor_id: selectedVendorId,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teacher link created successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-data-links'] });
      setCreateDialogOpen(false);
      setNewLink({
        teacherName: '',
        teacherEmail: '',
        teacherPhone: '',
        maxSubmissions: 100,
        projectId: '',
        vendorId: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create link');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('teacher_data_links')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link status updated');
      queryClient.invalidateQueries({ queryKey: ['teacher-data-links'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update link');
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_data_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link deleted');
      queryClient.invalidateQueries({ queryKey: ['teacher-data-links'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete link');
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/teacher-entry/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (link: any) => {
    if (!link.is_active) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (link.current_submissions >= link.max_submissions) {
      return <Badge variant="destructive">Limit Reached</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {links.filter((l: any) => l.is_active && l.current_submissions < l.max_submissions).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {links.reduce((sum: number, l: any) => sum + (l.current_submissions || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Limit Reached</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {links.filter((l: any) => l.current_submissions >= l.max_submissions).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Teacher Data Entry Links</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Teacher Data Entry Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Vendor selection for super_admin */}
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select 
                      value={newLink.vendorId} 
                      onValueChange={(v) => setNewLink({ ...newLink, vendorId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {allVendors.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.business_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Teacher Name *</Label>
                  <Input
                    value={newLink.teacherName}
                    onChange={(e) => setNewLink({ ...newLink, teacherName: e.target.value })}
                    placeholder="Enter teacher name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    value={newLink.teacherEmail}
                    onChange={(e) => setNewLink({ ...newLink, teacherEmail: e.target.value })}
                    placeholder="teacher@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    value={newLink.teacherPhone}
                    onChange={(e) => setNewLink({ ...newLink, teacherPhone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Submissions</Label>
                  <Input
                    type="number"
                    value={newLink.maxSubmissions}
                    onChange={(e) => setNewLink({ ...newLink, maxSubmissions: parseInt(e.target.value) || 100 })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link to Project (optional)</Label>
                  <Select 
                    value={newLink.projectId} 
                    onValueChange={(v) => setNewLink({ ...newLink, projectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.project_number} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createLinkMutation.mutate()}
                  disabled={
                    !newLink.teacherName || 
                    createLinkMutation.isPending || 
                    (isSuperAdmin && !newLink.vendorId)
                  }
                  className="w-full"
                >
                  {createLinkMutation.isPending ? 'Creating...' : 'Create Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading links...</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teacher links created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="font-medium">{link.teacher_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {link.teacher_email || link.teacher_phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {link.project ? (
                        <Badge variant="outline">{link.project.project_number}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{link.current_submissions}</span>
                        <span className="text-muted-foreground">/ {link.max_submissions}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(link)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {format(new Date(link.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(link.token)}
                          title="Copy Link"
                        >
                          {copiedId === link.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/teacher-entry/${link.token}`, '_blank')}
                          title="Open Link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLinkId(link.id);
                            setViewSubmissionsOpen(true);
                          }}
                          title="View Submissions"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActiveMutation.mutate({ id: link.id, isActive: link.is_active })}
                          title={link.is_active ? 'Disable' : 'Enable'}
                        >
                          <ToggleLeft className={`h-4 w-4 ${link.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this link? All submissions will be lost.')) {
                              deleteLinkMutation.mutate(link.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submissions Dialog */}
      <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Submissions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub: any) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {sub.student_photo_url ? (
                          <img 
                            src={sub.student_photo_url} 
                            alt={sub.student_name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{sub.student_name}</TableCell>
                      <TableCell>{sub.student_class || '-'}</TableCell>
                      <TableCell>{sub.roll_no || '-'}</TableCell>
                      <TableCell>{sub.parent_name || '-'}</TableCell>
                      <TableCell>{sub.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(sub.submitted_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
