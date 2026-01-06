import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DataRecordItemProps {
  record: {
    id: string;
    record_number: number;
    group_id: string | null;
    processing_status: string | null;
    data_json: Record<string, any>;
  };
  projectId: string;
}

export function DataRecordItem({ record, projectId }: DataRecordItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(record.data_json);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Get editable fields (exclude _original)
  const editableFields = Object.keys(editData).filter(k => k !== '_original');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('data_records')
        .update({ data_json: editData })
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Record updated');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setEditData(record.data_json);
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3 flex items-center justify-between bg-card">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-left flex-1">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <div>
                <p className="font-medium">Record #{record.record_number}</p>
                <p className="text-sm text-muted-foreground">
                  {record.group_id ? 'Assigned to group' : 'No group'} • {record.processing_status}
                </p>
              </div>
            </button>
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSave} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(true); setIsExpanded(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Record</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete Record #{record.record_number}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-3 border-t bg-muted/30">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {editableFields.map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{field}</Label>
                    <Input
                      value={editData[field] ?? ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {editableFields.map(field => (
                  <div key={field}>
                    <span className="text-muted-foreground">{field}: </span>
                    <span className="font-medium">{editData[field] ?? '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
