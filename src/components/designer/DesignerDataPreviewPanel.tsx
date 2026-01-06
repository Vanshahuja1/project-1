import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { X, Play, RefreshCw, Database, Eye, Code, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface SampleDataField {
  key: string;
  value: string;
  type: 'text' | 'image' | 'barcode' | 'qrcode';
}

interface DesignerDataPreviewPanelProps {
  onPreviewData: (data: Record<string, string>) => void;
  onResetPreview: () => void;
  isPreviewMode: boolean;
  onTogglePreviewMode: (enabled: boolean) => void;
  onClose: () => void;
  detectedVariables: string[];
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  className: '10th Grade',
  sec: 'A',
  admNo: 'ADM2024001',
  roll_no: '15',
  schoolCode: 'SCH001',
  session: '2024-25',
  dob: '15 Jan 2010',
  blood_group: 'O+',
  gender: 'Male',
  address: '123 Main Street, City',
  fatherName: 'Robert Doe',
  motherName: 'Jane Doe',
  fatherMobNo: '+91 98765 43210',
  motherMobNo: '+91 98765 43211',
  phone: '+91 98765 43210',
  email: 'john.doe@school.edu',
  id_number: 'ID2024001',
  rfid: 'RFID12345',
};

export function DesignerDataPreviewPanel({
  onPreviewData,
  onResetPreview,
  isPreviewMode,
  onTogglePreviewMode,
  onClose,
  detectedVariables,
}: DesignerDataPreviewPanelProps) {
  const [sampleData, setSampleData] = useState<Record<string, string>>(DEFAULT_SAMPLE_DATA);
  const [customJson, setCustomJson] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'fields' | 'json' | 'import'>('fields');
  const [importedRecords, setImportedRecords] = useState<Record<string, string>[]>([]);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update sample data fields based on detected variables
  const relevantFields = detectedVariables.filter(v => 
    !['photo', 'barcode', 'qr_code', 'profilePic'].includes(v)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const records = results.data as Record<string, string>[];
        if (records.length > 0) {
          setImportedRecords(records.filter(r => Object.keys(r).length > 1));
          setCurrentRecordIndex(0);
          setSampleData(records[0]);
          toast.success(`Imported ${records.length} records from CSV`);
        }
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });
  };

  const handleFieldChange = (key: string, value: string) => {
    setSampleData(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyPreview = () => {
    if (activeTab === 'json') {
      try {
        const parsed = JSON.parse(customJson);
        setSampleData(parsed);
        onPreviewData(parsed);
        toast.success('Preview data applied');
      } catch (e) {
        toast.error('Invalid JSON format');
      }
    } else {
      onPreviewData(sampleData);
      toast.success('Preview data applied');
    }
  };

  const handleReset = () => {
    setSampleData(DEFAULT_SAMPLE_DATA);
    onResetPreview();
    toast.success('Preview reset to template');
  };

  const handleLoadFromJson = () => {
    try {
      const parsed = JSON.parse(customJson);
      setSampleData(parsed);
      toast.success('Data loaded from JSON');
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const handleExportJson = () => {
    setCustomJson(JSON.stringify(sampleData, null, 2));
    setActiveTab('json');
  };

  return (
    <div className="w-80 bg-card border-r shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Preview
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Preview Mode</Label>
          <Switch
            checked={isPreviewMode}
            onCheckedChange={onTogglePreviewMode}
          />
        </div>
        {isPreviewMode && (
          <p className="text-xs text-muted-foreground bg-primary/10 rounded p-2">
            Variables are replaced with sample data
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {detectedVariables.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Detected Variables ({detectedVariables.length})
              </Label>
              <div className="flex flex-wrap gap-1">
                {detectedVariables.map(v => (
                  <span key={v} className="text-xs bg-muted px-2 py-0.5 rounded">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No variables detected. Add text elements with {`{{variableName}}`} syntax.
            </p>
          )}

          <Separator />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fields' | 'json' | 'import')}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="fields" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Fields
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                Import
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="mt-3 space-y-3">
              {relevantFields.length > 0 ? (
                relevantFields.map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{field}</Label>
                    <Input
                      value={sampleData[field] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      placeholder={`Enter ${field}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Add variable text fields to see them here
                </p>
              )}
            </TabsContent>

            <TabsContent value="import" className="mt-3 space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV/Excel
              </Button>
              
              {importedRecords.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span>Record {currentRecordIndex + 1} of {importedRecords.length}</span>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2"
                        disabled={currentRecordIndex === 0}
                        onClick={() => {
                          const newIndex = currentRecordIndex - 1;
                          setCurrentRecordIndex(newIndex);
                          setSampleData(importedRecords[newIndex]);
                          onPreviewData(importedRecords[newIndex]);
                        }}
                      >
                        Prev
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2"
                        disabled={currentRecordIndex >= importedRecords.length - 1}
                        onClick={() => {
                          const newIndex = currentRecordIndex + 1;
                          setCurrentRecordIndex(newIndex);
                          setSampleData(importedRecords[newIndex]);
                          onPreviewData(importedRecords[newIndex]);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preview each record or use them to generate templates.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="mt-3 space-y-3">
              <Textarea
                value={customJson || JSON.stringify(sampleData, null, 2)}
                onChange={(e) => setCustomJson(e.target.value)}
                placeholder='{"name": "John Doe", ...}'
                className="min-h-[200px] font-mono text-xs"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={handleLoadFromJson}>
                Load from JSON
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2 flex-shrink-0">
        <Button 
          className="w-full" 
          onClick={handleApplyPreview}
          disabled={!isPreviewMode}
        >
          <Play className="h-4 w-4 mr-2" />
          Apply Preview
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleReset}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleExportJson}>
            <Code className="h-3 w-3 mr-1" />
            To JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
