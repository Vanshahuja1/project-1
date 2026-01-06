import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  template_id: string | null;
  record_count?: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

interface GeneratePreviewDialogProps {
  projectId: string;
  vendorId: string;
  groups: Group[];
}

export function GeneratePreviewDialog({ projectId, vendorId, groups }: GeneratePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('__all__');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['vendor-templates-preview', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, category')
        .or(`vendor_id.eq.${vendorId},is_public.eq.true`)
        .order('name');

      if (error) throw error;
      return data as Template[];
    },
    enabled: open && !!vendorId,
  });

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      // Build query for records
      let query = supabase
        .from('data_records')
        .select('*')
        .eq('project_id', projectId)
        .order('record_number')
        .limit(10); // Preview is limited to first 10 records for performance

      if (selectedGroupId !== '__all__') {
        query = query.eq('group_id', selectedGroupId);
      }

      const { data: records, error: recordsError } = await query;

      if (recordsError) throw recordsError;

      if (!records || records.length === 0) {
        toast.error('No records found for the selected criteria');
        setIsGenerating(false);
        return;
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', selectedTemplateId)
        .single();

      if (templateError) throw templateError;

      // Call generate-pdf edge function with correct payload
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: {
          projectId: projectId,
          groupId: selectedGroupId === '__all__' ? undefined : selectedGroupId,
          templateData: {
            design_json: template.design_json,
            back_design_json: template.back_design_json,
            has_back_side: template.has_back_side,
            width_mm: template.width_mm,
            height_mm: template.height_mm,
          },
          records: records,
          options: {
            pageSize: 'A4',
            orientation: 'portrait',
          },
        },
      });

      if (pdfError) throw pdfError;

      if (pdfData?.url) {
        setPreviewUrl(pdfData.url);
        toast.success('Preview generated successfully');
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (error: any) {
      console.error('Preview generation error:', error);
      toast.error('Failed to generate preview: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPreviewUrl(null);
      setSelectedTemplateId('');
      setSelectedGroupId('__all__');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Generate Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Preview (First 10 Records)</DialogTitle>
          <p className="text-sm text-muted-foreground">This preview shows the first 10 records. Use the PDF Generator for full output.</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Group</Label>
            <Select
              value={selectedGroupId}
              onValueChange={setSelectedGroupId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Records</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.record_count || 0} records)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewUrl && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  Open in new tab
                </Button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-[400px]"
                title="PDF Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedTemplateId}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
