import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Search, MoreHorizontal, RefreshCcw, ArrowRightLeft, Eye, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PROJECT_STATUSES = [
  'draft',
  'data_upload',
  'design',
  'proof_ready',
  'approved',
  'printing',
  'dispatched',
  'delivered',
  'cancelled',
] as const;

type ProjectStatus = typeof PROJECT_STATUSES[number];

export function GlobalProjectsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [newVendorId, setNewVendorId] = useState('');

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('active', true)
        .order('business_name');

      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['global-projects', selectedVendor, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          vendor:vendors(id, business_name),
          client:clients(name, institution_name),
          product:products(name, category)
        `)
        .order('created_at', { ascending: false });

      if (selectedVendor !== 'all') {
        query = query.eq('vendor_id', selectedVendor);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus as ProjectStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Project status updated');
      queryClient.invalidateQueries({ queryKey: ['global-projects'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const reassignProjectMutation = useMutation({
    mutationFn: async ({ projectId, vendorId }: { projectId: string; vendorId: string }) => {
      // Also need to update clients if they were vendor-specific
      const { error } = await supabase
        .from('projects')
        .update({ vendor_id: vendorId })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Project reassigned successfully');
      queryClient.invalidateQueries({ queryKey: ['global-projects'] });
      setReassignDialogOpen(false);
      setSelectedProject(null);
      setNewVendorId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reassign project');
    },
  });

  const filteredProjects = projects.filter((project) =>
    searchQuery === '' ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client?.institution_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.vendor?.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'data_upload': return 'bg-blue-500';
      case 'design': return 'bg-yellow-500';
      case 'proof_ready': return 'bg-indigo-500';
      case 'approved': return 'bg-green-500';
      case 'printing': return 'bg-orange-500';
      case 'dispatched': return 'bg-purple-500';
      case 'delivered': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleReassignOpen = (project: any) => {
    setSelectedProject(project);
    setNewVendorId('');
    setReassignDialogOpen(true);
  };

  const handleReassign = () => {
    if (!selectedProject || !newVendorId) {
      toast.error('Please select a vendor');
      return;
    }
    if (newVendorId === selectedProject.vendor_id) {
      toast.error('Project is already assigned to this vendor');
      return;
    }
    reassignProjectMutation.mutate({ projectId: selectedProject.id, vendorId: newVendorId });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Global Projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">Loading projects...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="hidden md:table-cell">Vendor</TableHead>
                  <TableHead className="hidden sm:table-cell">Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{project.project_number}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{project.vendor?.business_name}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {project.client?.institution_name || project.client?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={project.status || 'draft'}
                          onValueChange={(value) => updateStatusMutation.mutate({ projectId: project.id, status: value as ProjectStatus })}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <Badge className={`${getStatusColor(project.status || 'draft')} text-white text-xs`}>
                              {project.status?.replace(/_/g, ' ') || 'Draft'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replace(/_/g, ' ').toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant={
                            project.payment_status === 'completed' ? 'default' :
                            project.payment_status === 'partial' ? 'secondary' : 'outline'
                          }
                          className={project.payment_status === 'completed' ? 'bg-green-500' : ''}
                        >
                          {project.payment_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{Number(project.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(project.created_at), 'dd MMM')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/project/${project.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReassignOpen(project)}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Reassign Vendor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDFs
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Project</div>
              <div className="font-medium">{selectedProject?.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Currently: {selectedProject?.vendor?.business_name}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Vendor</Label>
              <Select value={newVendorId} onValueChange={setNewVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors
                    .filter(v => v.id !== selectedProject?.vendor_id)
                    .map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.business_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleReassign} 
              className="w-full" 
              disabled={!newVendorId || reassignProjectMutation.isPending}
            >
              {reassignProjectMutation.isPending ? 'Reassigning...' : 'Reassign Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
