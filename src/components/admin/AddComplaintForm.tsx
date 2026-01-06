import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus } from 'lucide-react';

export function AddComplaintForm() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    client_id: '',
    vendor_id: '',
    project_id: '',
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('active', true)
        .order('business_name');
      if (error) throw error;
      return data;
    },
    enabled: open && isSuperAdmin,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list', formData.vendor_id],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id, name, institution_name')
        .eq('active', true)
        .order('name');
      
      if (formData.vendor_id) {
        query = query.eq('vendor_id', formData.vendor_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', formData.vendor_id, formData.client_id],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, project_number')
        .order('created_at', { ascending: false });
      
      if (formData.vendor_id) {
        query = query.eq('vendor_id', formData.vendor_id);
      }
      if (formData.client_id) {
        query = query.eq('client_id', formData.client_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && (!!formData.vendor_id || !!formData.client_id),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('complaints').insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        client_id: formData.client_id,
        vendor_id: formData.vendor_id,
        project_id: formData.project_id || null,
      });

      if (error) throw error;

      toast.success('Complaint created successfully');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        client_id: '',
        vendor_id: '',
        project_id: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Complaint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Complaint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => setFormData({ ...formData, vendor_id: value, client_id: '', project_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value, project_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.institution_name || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Related Project (Optional)</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_number} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.client_id || !formData.vendor_id}>
            {loading ? 'Creating...' : 'Create Complaint'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
