import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TemplatePreview } from './TemplatePreview';

interface Group {
  id: string;
  name: string;
  template_id: string | null;
  record_count: number;
  template?: {
    id: string;
    name: string;
    thumbnail_url: string | null;
    design_json?: unknown;
  } | null;
}

interface ProjectGroupsManagerProps {
  projectId: string;
  groups: Group[];
}

export function ProjectGroupsManager({ projectId, groups }: ProjectGroupsManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, thumbnail_url, category')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, templateId }: { name: string; templateId?: string }) => {
      const { data, error } = await supabase
        .from('project_groups')
        .insert({
          project_id: projectId,
          name,
          template_id: templateId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Group created successfully');
      setIsCreateOpen(false);
      setNewGroupName('');
      setSelectedTemplateId('');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error: any) => {
      toast.error('Failed to create group: ' + error.message);
    },
  });

  const updateGroupTemplateMutation = useMutation({
    mutationFn: async ({ groupId, templateId }: { groupId: string; templateId: string | null }) => {
      const { error } = await supabase
        .from('project_groups')
        .update({ template_id: templateId })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template assignment updated');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error: any) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('project_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete group: ' + error.message);
    },
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    createGroupMutation.mutate({ 
      name: newGroupName,
      templateId: selectedTemplateId || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Groups & Template Assignment</h2>
          <p className="text-sm text-muted-foreground">
            Create groups and assign templates to organize your project
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Class A, Teachers, Staff"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Assign Template (Optional)</Label>
                <Select value={selectedTemplateId || '__none__'} onValueChange={(val) => setSelectedTemplateId(val === '__none__' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending}
              >
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No groups yet. Create a group to organize your project data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this group? Records will not be deleted.')) {
                        deleteGroupMutation.mutate(group.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <TemplatePreview 
                  designJson={group.template?.design_json}
                  width={undefined}
                  height={140}
                  className="w-full"
                />
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{group.record_count || 0} records</span>
                  {group.template && <span className="text-xs">{group.template.name}</span>}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Assigned Template</Label>
                  <Select 
                    value={group.template_id || '__none__'} 
                    onValueChange={(value) => 
                      updateGroupTemplateMutation.mutate({
                        groupId: group.id,
                        templateId: value === '__none__' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="No template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
