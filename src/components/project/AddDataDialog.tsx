import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { ExcelUpload } from '@/components/data/ExcelUpload';
import { ColumnMapper } from '@/components/data/ColumnMapper';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddDataDialogProps {
  projectId: string;
  groupId?: string;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function AddDataDialog({ projectId, groupId, triggerRef }: AddDataDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleDataParsed = (data: any[], columns: string[]) => {
    setUploadedData(data);
    setDetectedColumns(columns);
    setStep('mapping');
  };

  const handleMappingComplete = (newMapping: Record<string, string>) => {
    setMapping(newMapping);
    setStep('preview');
  };

  // Get mapped preview data
  const getMappedData = () => {
    return uploadedData.slice(0, 10).map((row) => {
      const mapped: Record<string, any> = {};
      Object.entries(mapping).forEach(([variableField, sourceColumn]) => {
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mapped[variableField] = row[sourceColumn];
        }
      });
      return mapped;
    });
  };

  const mappedFields = Object.keys(mapping).filter(k => mapping[k]);

  const handleSaveData = async () => {
    setIsSubmitting(true);
    
    try {
      const { data: existingRecords } = await supabase
        .from('data_records')
        .select('record_number')
        .eq('project_id', projectId)
        .order('record_number', { ascending: false })
        .limit(1);

      const startingNumber = (existingRecords?.[0]?.record_number || 0) + 1;

      const records = uploadedData.map((row, index) => {
        const dataJson: Record<string, any> = {};
        
        Object.entries(mapping).forEach(([variableField, sourceColumn]) => {
          if (sourceColumn && row[sourceColumn] !== undefined) {
            dataJson[variableField] = row[sourceColumn];
          }
        });

        dataJson._original = row;

        return {
          project_id: projectId,
          group_id: groupId || null,
          record_number: startingNumber + index,
          data_json: dataJson,
          processing_status: 'pending'
        };
      });

      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from('data_records')
          .insert(batch);

        if (error) throw error;
      }

      toast.success(`Successfully added ${records.length} records`);
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      
      setOpen(false);
      resetState();
    } catch (error) {
      console.error('Error adding data:', error);
      toast.error('Failed to add data records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('upload');
    setUploadedData([]);
    setDetectedColumns([]);
    setMapping({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button ref={triggerRef} variant="outline" className={triggerRef ? 'hidden' : ''}>
          <Plus className="h-4 w-4 mr-2" />
          Add Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Step 1: Upload Data File'}
            {step === 'mapping' && 'Step 2: Map Columns'}
            {step === 'preview' && 'Step 3: Preview & Confirm'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'upload' && (
          <ExcelUpload onDataParsed={handleDataParsed} />
        )}
        
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {uploadedData.length} records detected. Map your columns to variable fields.
            </p>
            <ColumnMapper 
              detectedColumns={detectedColumns} 
              onMappingComplete={handleMappingComplete}
            />
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview of first 10 records (out of {uploadedData.length} total). Verify the mapping is correct.
            </p>
            
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {mappedFields.map(field => (
                      <TableHead key={field} className="min-w-[120px]">{field}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData().map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      {mappedFields.map(field => (
                        <TableCell key={field} className="max-w-[200px] truncate">
                          {row[field] ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mapping
              </Button>
              <Button onClick={handleSaveData} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Save {uploadedData.length} Records
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
