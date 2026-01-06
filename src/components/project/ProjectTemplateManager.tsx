import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, MoreVertical, Edit, Trash2, Eye, FileText, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  category: string;
  width_mm: number;
  height_mm: number;
  is_public: boolean;
  vendor_id: string | null;
  design_json: any;
  thumbnail_url: string | null;
  created_at: string;
}

interface ProjectTemplateManagerProps {
  vendorId: string;
  projectId: string;
}

const PAGE_FORMATS = [
  { label: 'Page: A4', sublabel: '297×210mm', width: 210, height: 297 },
  { label: 'Page: 13×19', sublabel: '330×482mm', width: 330, height: 482 },
];

const TEMPLATE_TYPES = [
  'id_card',
  'certificate',
  'label',
  'badge',
  'custom',
];

export function ProjectTemplateManager({ vendorId, projectId }: ProjectTemplateManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'id_card',
    pageFormat: 'a4',
    customWidth: 85.6,
    customHeight: 54,
    marginTop: 1,
    marginLeft: 1,
    marginRight: 1,
    marginBottom: 1,
    applicableFor: '__all__',
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['vendor-templates', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: !!vendorId,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['project-groups', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_groups')
        .select('id, name')
        .eq('project_id', projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let width = data.customWidth;
      let height = data.customHeight;

      if (data.pageFormat === 'a4') {
        width = 210;
        height = 297;
      } else if (data.pageFormat === '13x19') {
        width = 330;
        height = 482;
      }

      const designJson = {
        version: '1.0',
        objects: [],
        background: '#ffffff',
        pageMargins: {
          top: data.marginTop,
          left: data.marginLeft,
          right: data.marginRight,
          bottom: data.marginBottom,
        },
      };

      const { data: newTemplate, error } = await supabase
        .from('templates')
        .insert({
          name: data.name,
          category: data.category,
          width_mm: width,
          height_mm: height,
          vendor_id: vendorId,
          design_json: designJson,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      // If applicable for a specific group, assign the template to that group
      if (data.applicableFor !== '__all__' && newTemplate) {
        await supabase
          .from('project_groups')
          .update({ template_id: newTemplate.id })
          .eq('id', data.applicableFor);
      }

      return newTemplate;
    },
    onSuccess: (newTemplate) => {
      toast.success('Template created successfully');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      
      // Navigate to template designer
      if (newTemplate) {
        navigate(`/template-designer?templateId=${newTemplate.id}`);
      }
    },
    onError: (error: any) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      let width = data.customWidth;
      let height = data.customHeight;

      if (data.pageFormat === 'a4') {
        width = 210;
        height = 297;
      } else if (data.pageFormat === '13x19') {
        width = 330;
        height = 482;
      }

      const { error } = await supabase
        .from('templates')
        .update({
          name: data.name,
          category: data.category,
          width_mm: width,
          height_mm: height,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template updated');
      setIsEditOpen(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
    },
    onError: (error: any) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['vendor-templates', vendorId] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'id_card',
      pageFormat: 'a4',
      customWidth: 85.6,
      customHeight: 54,
      marginTop: 1,
      marginLeft: 1,
      marginRight: 1,
      marginBottom: 1,
      applicableFor: '__all__',
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    createTemplateMutation.mutate(formData);
  };

  const handleEditOpen = (template: Template) => {
    setSelectedTemplate(template);
    const isA4 = template.width_mm === 210 && template.height_mm === 297;
    const is13x19 = template.width_mm === 330 && template.height_mm === 482;
    
    setFormData({
      name: template.name,
      category: template.category,
      pageFormat: isA4 ? 'a4' : is13x19 ? '13x19' : 'custom',
      customWidth: template.width_mm,
      customHeight: template.height_mm,
      marginTop: 1,
      marginLeft: 1,
      marginRight: 1,
      marginBottom: 1,
      applicableFor: '__all__',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTemplate || !formData.name.trim()) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: formData });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage templates for this project
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FileText className="h-16 w-16 text-muted-foreground/50" />
                )}
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/template-designer?templateId=${template.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Design
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditOpen(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.width_mm} × {template.height_mm} mm
                    </p>
                  </div>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ID CARD 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Format</Label>
              <RadioGroup
                value={formData.pageFormat}
                onValueChange={(v) => setFormData({ ...formData, pageFormat: v })}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="a4" id="a4" />
                  <Label htmlFor="a4" className="cursor-pointer">
                    <div className="font-medium text-sm">A4</div>
                    <div className="text-xs text-muted-foreground">297×210mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="13x19" id="13x19" />
                  <Label htmlFor="13x19" className="cursor-pointer">
                    <div className="font-medium text-sm">13×19</div>
                    <div className="text-xs text-muted-foreground">330×482mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Custom
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.pageFormat === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customWidth}
                    onChange={(e) => setFormData({ ...formData, customWidth: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customHeight}
                    onChange={(e) => setFormData({ ...formData, customHeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Page margin(mm)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Top</Label>
                  <Input
                    type="number"
                    value={formData.marginTop}
                    onChange={(e) => setFormData({ ...formData, marginTop: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    value={formData.marginLeft}
                    onChange={(e) => setFormData({ ...formData, marginLeft: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Right</Label>
                  <Input
                    type="number"
                    value={formData.marginRight}
                    onChange={(e) => setFormData({ ...formData, marginRight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bottom</Label>
                  <Input
                    type="number"
                    value={formData.marginBottom}
                    onChange={(e) => setFormData({ ...formData, marginBottom: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applicable for</Label>
              <Select
                value={formData.applicableFor}
                onValueChange={(v) => setFormData({ ...formData, applicableFor: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select applicable for" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? 'Creating...' : 'Add template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Format</Label>
              <RadioGroup
                value={formData.pageFormat}
                onValueChange={(v) => setFormData({ ...formData, pageFormat: v })}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="a4" id="edit-a4" />
                  <Label htmlFor="edit-a4" className="cursor-pointer">
                    <div className="font-medium text-sm">A4</div>
                    <div className="text-xs text-muted-foreground">297×210mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="13x19" id="edit-13x19" />
                  <Label htmlFor="edit-13x19" className="cursor-pointer">
                    <div className="font-medium text-sm">13×19</div>
                    <div className="text-xs text-muted-foreground">330×482mm</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="custom" id="edit-custom" />
                  <Label htmlFor="edit-custom" className="cursor-pointer">
                    <div className="font-medium text-sm">Custom</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.pageFormat === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customWidth}
                    onChange={(e) => setFormData({ ...formData, customWidth: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={formData.customHeight}
                    onChange={(e) => setFormData({ ...formData, customHeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateTemplateMutation.isPending}>
              {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
