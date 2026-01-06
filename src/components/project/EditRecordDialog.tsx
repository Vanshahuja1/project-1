import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DataRecord {
  id: string;
  record_number: number;
  group_id: string | null;
  processing_status: string | null;
  data_json: Record<string, any>;
}

interface EditRecordDialogProps {
  record: DataRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function EditRecordDialog({ record, open, onOpenChange, projectId }: EditRecordDialogProps) {
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Update editData when record changes or dialog opens
  useEffect(() => {
    if (record && open) {
      setEditData({ ...record.data_json });
    }
  }, [record, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && record) {
      setEditData(record.data_json);
    }
    onOpenChange(newOpen);
  };

  const editableFields = Object.keys(editData).filter(k => k !== '_original');

  const handleFieldChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!record) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('data_records')
        .update({ data_json: editData })
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Record updated');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Record #{record.record_number}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {editableFields.map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{field}</Label>
                <Input
                  id={field}
                  value={editData[field] ?? ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
