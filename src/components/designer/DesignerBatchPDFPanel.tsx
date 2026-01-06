import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  Grid3X3,
  ImageIcon,
  FolderArchive
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

interface DesignerBatchPDFPanelProps {
  canvas: any;
  backCanvas?: any;
  templateName: string;
  hasBackSide: boolean;
  widthMm: number;
  heightMm: number;
  designJson: any;
  backDesignJson?: any;
  category: string;
  onPreviewRecord?: (record: Record<string, string>) => void;
  onClose: () => void;
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

const BATCH_SIZE = 25;

export function DesignerBatchPDFPanel({
  canvas,
  backCanvas,
  templateName,
  hasBackSide,
  widthMm,
  heightMm,
  designJson,
  backDesignJson,
  category,
  onPreviewRecord,
  onClose,
}: DesignerBatchPDFPanelProps) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [generatedPDFs, setGeneratedPDFs] = useState<{ side: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photoFieldName, setPhotoFieldName] = useState<string>('');

  // Photo field mapping state - maps template photo placeholders to CSV columns
  const [photoFieldMappings, setPhotoFieldMappings] = useState<Record<string, string>>({});
  
  const [options, setOptions] = useState({
    includeBleed: true,
    includeCropMarks: true,
    pageSize: 'A4' as 'A4' | 'A3' | 'Letter' | 'card',
    orientation: 'portrait' as 'portrait' | 'landscape',
    cardsPerRow: 0,
    cardsPerColumn: 0,
    cardSpacing: 5,
    pageMargin: 10,
    separateFrontBack: false,
    side: 'both' as 'front' | 'back' | 'both',
    showSerialNumbers: true,
    serialNumberPrefix: '',
    startingSerialNumber: 1,
    showPageNumbers: true,
  });
  
  // Extract photo placeholders from template design
  const templatePhotoPlaceholders = useMemo(() => {
    const placeholders: string[] = [];
    
    const extractFromDesign = (design: any) => {
      if (!design?.objects) return;
      design.objects.forEach((obj: any) => {
        if (obj.data?.isPhotoPlaceholder || obj.data?.type === 'photo-placeholder') {
          const name = obj.data?.name || obj.data?.fieldName || 'photo';
          if (!placeholders.includes(name)) {
            placeholders.push(name);
          }
        }
        // Also check for image objects with variable names
        if (obj.type === 'image' && obj.data?.variableName) {
          const name = obj.data.variableName;
          if (!placeholders.includes(name)) {
            placeholders.push(name);
          }
        }
      });
    };
    
    extractFromDesign(designJson);
    if (backDesignJson) extractFromDesign(backDesignJson);
    
    // Add default photo placeholder
    if (placeholders.length === 0) {
      placeholders.push('photo');
    }
    
    return placeholders;
  }, [designJson, backDesignJson]);

  const previewInfo = useMemo(() => {
    if (csvData.length === 0) return null;

    const cardWidthMm = widthMm || 85.6;
    const cardHeightMm = heightMm || 54;
    const bleedMm = options.includeBleed ? 3 : 0;
    const cardWidthWithBleed = cardWidthMm + bleedMm * 2;
    const cardHeightWithBleed = cardHeightMm + bleedMm * 2;

    if (options.pageSize === 'card') {
      return {
        cardsPerRow: 1,
        cardsPerColumn: 1,
        cardsPerPage: 1,
        totalPages: csvData.length,
        pageWidth: cardWidthWithBleed,
        pageHeight: cardHeightWithBleed,
      };
    }

    const pageDimensions = PAGE_SIZES[options.pageSize] || PAGE_SIZES.A4;
    let pageWidth = options.orientation === 'landscape' ? pageDimensions.height : pageDimensions.width;
    let pageHeight = options.orientation === 'landscape' ? pageDimensions.width : pageDimensions.height;

    const marginMm = options.pageMargin;
    const spacingMm = options.cardSpacing;

    let cardsPerRow = options.cardsPerRow || Math.floor((pageWidth - marginMm * 2 + spacingMm) / (cardWidthWithBleed + spacingMm));
    let cardsPerColumn = options.cardsPerColumn || Math.floor((pageHeight - marginMm * 2 + spacingMm) / (cardHeightWithBleed + spacingMm));

    cardsPerRow = Math.max(1, cardsPerRow);
    cardsPerColumn = Math.max(1, cardsPerColumn);

    const cardsPerPage = cardsPerRow * cardsPerColumn;
    const totalPages = Math.ceil(csvData.length / cardsPerPage);

    return {
      cardsPerRow,
      cardsPerColumn,
      cardsPerPage,
      totalPages,
      pageWidth,
      pageHeight,
    };
  }, [csvData.length, widthMm, heightMm, options]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.endsWith('.csv');
    if (!isCSV) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let cols = results.meta.fields || [];
          cols = cols.map((col, index) => {
            if (index === 0) {
              return col.replace(/^\ufeff/, '').replace(/^\xef\xbb\xbf/, '');
            }
            return col;
          });
          
          const data = results.data as any[];

          if (cols.length === 0 || data.length === 0) {
            setError('No data found in file');
            setIsProcessing(false);
            return;
          }

          setColumns(cols);
          setCsvData(data);
          toast.success(`Loaded ${data.length} records with ${cols.length} columns`);
          setIsProcessing(false);
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setIsProcessing(false);
        },
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setCsvData([]);
    setColumns([]);
    setGeneratedPDFs([]);
    setProgress(0);
    setUploadedPhotos(new Map());
    setPhotoFieldName('');
  };

  const handlePreview = (record: Record<string, string>) => {
    onPreviewRecord?.(record);
  };

  // Handle ZIP photo upload
  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file containing photos');
      return;
    }

    setIsUploadingPhotos(true);
    setPhotoUploadProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const imageFiles = Object.keys(contents.files).filter(filename => {
        const lower = filename.toLowerCase();
        return !filename.startsWith('__MACOSX') && 
               !filename.startsWith('.') &&
               (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp'));
      });

      if (imageFiles.length === 0) {
        toast.error('No image files found in ZIP');
        setIsUploadingPhotos(false);
        return;
      }

      toast.info(`Found ${imageFiles.length} images. Uploading...`);

      const projectId = `batch-${Date.now()}`;
      const photoMap = new Map<string, string>();
      const UPLOAD_BATCH_SIZE = 10;

      for (let i = 0; i < imageFiles.length; i += UPLOAD_BATCH_SIZE) {
        const batch = imageFiles.slice(i, i + UPLOAD_BATCH_SIZE);
        
        await Promise.all(batch.map(async (filename) => {
          try {
            const fileData = await contents.files[filename].async('blob');
            const baseName = filename.split('/').pop() || filename;
            const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');
            const ext = baseName.split('.').pop()?.toLowerCase() || 'jpg';
            
            const mimeTypes: Record<string, string> = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'webp': 'image/webp',
            };
            const contentType = mimeTypes[ext] || 'image/jpeg';
            const typedBlob = new Blob([fileData], { type: contentType });
            
            const storagePath = `${projectId}/${baseName}`;
            const { error: uploadError } = await supabase.storage
              .from('project-photos')
              .upload(storagePath, typedBlob, { contentType, upsert: true });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('project-photos')
                .getPublicUrl(storagePath);
              
              // Store with multiple key variations for matching
              photoMap.set(nameWithoutExt, publicUrl);
              photoMap.set(nameWithoutExt.toLowerCase(), publicUrl);
              photoMap.set(baseName, publicUrl);
              photoMap.set(baseName.toLowerCase(), publicUrl);
            }
          } catch (err) {
            console.error('Failed to upload:', filename, err);
          }
        }));

        setPhotoUploadProgress(Math.round(((i + batch.length) / imageFiles.length) * 100));
      }

      setUploadedPhotos(photoMap);
      toast.success(`Uploaded ${photoMap.size / 4} photos successfully`);
      
      // Auto-detect photo field if not set
      if (!photoFieldName && columns.length > 0) {
        const photoFields = ['photo', 'image', 'picture', 'filename', 'file', 'photo_url', 'roll_no', 'rollno', 'id'];
        const detected = columns.find(col => photoFields.some(pf => col.toLowerCase().includes(pf)));
        if (detected) setPhotoFieldName(detected);
      }
    } catch (err) {
      console.error('Failed to process ZIP:', err);
      toast.error('Failed to extract photos from ZIP file');
    } finally {
      setIsUploadingPhotos(false);
      event.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload CSV data first');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedPDFs([]);

    try {
      // Get canvas dimensions from the canvas object
      const canvasWidth = canvas?.getWidth?.() || (widthMm * 3.78);
      const canvasHeight = canvas?.getHeight?.() || (heightMm * 3.78);
      
      // Merge canvas dimensions into design_json
      const enrichedDesignJson = designJson ? {
        ...designJson,
        width: canvasWidth,
        height: canvasHeight,
      } : null;
      
      const enrichedBackDesignJson = backDesignJson && backCanvas ? {
        ...backDesignJson,
        width: backCanvas.getWidth?.() || canvasWidth,
        height: backCanvas.getHeight?.() || canvasHeight,
      } : backDesignJson;

      const templateData = {
        name: templateName,
        width_mm: widthMm,
        height_mm: heightMm,
        design_json: enrichedDesignJson,
        back_design_json: enrichedBackDesignJson,
        has_back_side: hasBackSide,
        category,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
      };

      // Transform CSV data to match expected format with photo URLs
      const records = csvData.map((row, index) => {
        // Build photo URLs map for all photo placeholders
        const photoUrls: Record<string, string | null> = {};
        
        templatePhotoPlaceholders.forEach(placeholder => {
          let photoUrl: string | null = null;
          
          // Check if there's a mapping for this placeholder
          const mappedColumn = photoFieldMappings[placeholder] || photoFieldName;
          
          if (uploadedPhotos.size > 0 && mappedColumn && row[mappedColumn]) {
            const fieldValue = String(row[mappedColumn]).trim();
            photoUrl = uploadedPhotos.get(fieldValue) || 
                       uploadedPhotos.get(fieldValue.toLowerCase()) ||
                       uploadedPhotos.get(fieldValue.replace(/\.[^.]+$/, '')) || null;
          }
          
          // Fallback: try common fields if not found
          if (!photoUrl && uploadedPhotos.size > 0) {
            const tryFields = ['roll_no', 'rollno', 'id', 'student_id', 'filename', 'name'];
            for (const field of tryFields) {
              const val = row[field] || row[field.toLowerCase()];
              if (val) {
                const strVal = String(val).trim();
                photoUrl = uploadedPhotos.get(strVal) || 
                           uploadedPhotos.get(strVal.toLowerCase()) || null;
                if (photoUrl) break;
              }
            }
          }
          
          photoUrls[placeholder] = photoUrl;
        });
        
        // Use first photo URL as the main photo_url for backwards compatibility
        const mainPhotoUrl = photoUrls[templatePhotoPlaceholders[0]] || null;
        
        return {
          id: `batch-${index}`,
          record_number: index + 1,
          data_json: row,
          photo_url: mainPhotoUrl,
          photo_urls: photoUrls, // All mapped photo URLs
        };
      });

      const numBatches = Math.ceil(records.length / BATCH_SIZE);
      setTotalBatches(numBatches);
      
      toast.info(`Starting PDF generation for ${records.length} cards in ${numBatches} batch${numBatches > 1 ? 'es' : ''}...`);

      const allResults: { side: string; url: string }[] = [];

      for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        setCurrentBatch(batchIndex + 1);
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, records.length);
        const batchRecords = records.slice(start, end);

        const { data, error } = await supabase.functions.invoke('generate-pdf', {
          body: {
            projectId: 'batch-generation',
            templateData,
            records: batchRecords,
            options: {
              ...options,
              cardsPerRow: options.cardsPerRow || undefined,
              cardsPerColumn: options.cardsPerColumn || undefined,
            },
            batchIndex,
            totalBatches: numBatches,
          },
        });

        if (error) throw error;

        if (data.urls) {
          allResults.push(...data.urls);
        } else if (data.url) {
          allResults.push({ side: 'front', url: data.url });
        }

        const progressPercent = Math.round(((batchIndex + 1) / numBatches) * 100);
        setProgress(progressPercent);
      }

      setGeneratedPDFs(allResults);
      toast.success(`PDF generated successfully! ${allResults.length} file(s) created.`);
      setProgress(100);
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
      setCurrentBatch(0);
    }
  };

  return (
    <div className="absolute left-12 top-0 bottom-0 w-80 bg-card border-r shadow-lg z-20 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Batch PDF Generation
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* CSV Upload */}
          {csvData.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Import CSV Data</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a CSV file with your data
                  </p>
                </div>

                <label htmlFor="csv-upload">
                  <Button variant="outline" size="sm" disabled={isProcessing} asChild>
                    <span>
                      {isProcessing ? 'Processing...' : 'Choose File'}
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="mt-3 p-2 bg-destructive/10 rounded text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Data Summary */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Data Loaded
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive"
                    onClick={handleClearData}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Records:</strong> {csvData.length}</p>
                  <p><strong>Columns:</strong> {columns.join(', ')}</p>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <Label className="text-xs">Data Preview (first 5 rows)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 text-xs">#</TableHead>
                          {columns.slice(0, 3).map((col) => (
                            <TableHead key={col} className="text-xs min-w-20">{col}</TableHead>
                          ))}
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            {columns.slice(0, 3).map((col) => (
                              <TableCell key={col} className="text-xs truncate max-w-20">
                                {row[col] || '-'}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handlePreview(row)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Layout Preview */}
              {previewInfo && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Grid3X3 className="h-3 w-3" />
                    Layout Preview
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cards/page:</span>
                      <span className="ml-1 font-medium">{previewInfo.cardsPerPage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total pages:</span>
                      <span className="ml-1 font-medium">{previewInfo.totalPages}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Layout:</span>
                      <span className="ml-1 font-medium">{previewInfo.cardsPerRow}×{previewInfo.cardsPerColumn}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Upload Section */}
              <div className="p-3 border rounded-lg space-y-3 bg-background">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <FolderArchive className="h-3 w-3" />
                  Photo Upload (Optional)
                </div>
                
                {uploadedPhotos.size === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Upload a ZIP with photos. Filenames should match a field in your CSV (e.g., roll_no.jpg).
                    </p>
                    <label htmlFor="zip-upload">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isUploadingPhotos} 
                        className="w-full"
                        asChild
                      >
                        <span>
                          {isUploadingPhotos ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Uploading {photoUploadProgress}%
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Upload Photos ZIP
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="zip-upload"
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                    {isUploadingPhotos && (
                      <Progress value={photoUploadProgress} className="h-1" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {Math.floor(uploadedPhotos.size / 4)} photos uploaded
                    </div>
                    
                    {/* Photo Field Mapping */}
                    <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                      <Label className="text-xs font-medium">Map Photo Placeholders to CSV Columns</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Match template photo placeholders with your CSV column for filename lookup.
                      </p>
                      
                      {templatePhotoPlaceholders.map((placeholder) => (
                        <div key={placeholder} className="flex items-center gap-2">
                          <span className="text-xs font-medium min-w-20 truncate" title={placeholder}>
                            {placeholder}:
                          </span>
                          <Select
                            value={photoFieldMappings[placeholder] || photoFieldName || ''}
                            onValueChange={(value) => {
                              setPhotoFieldMappings(prev => ({
                                ...prev,
                                [placeholder]: value
                              }));
                              // Also set the main photo field if not set
                              if (!photoFieldName) setPhotoFieldName(value);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                              <SelectValue placeholder="Select CSV column" />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {columns.map((col) => (
                                <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => {
                        setUploadedPhotos(new Map());
                        setPhotoFieldName('');
                        setPhotoFieldMappings({});
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Photos
                    </Button>
                  </div>
                )}
              </div>

              {/* PDF Options */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">PDF Options</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Page Size</Label>
                    <Select
                      value={options.pageSize}
                      onValueChange={(value: any) => setOptions({ ...options, pageSize: value })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="card">Single Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Orientation</Label>
                    <Select
                      value={options.orientation}
                      onValueChange={(value: any) => setOptions({ ...options, orientation: value })}
                      disabled={options.pageSize === 'card'}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {options.pageSize !== 'card' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Spacing (mm)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={options.cardSpacing}
                        onChange={(e) => setOptions({ ...options, cardSpacing: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Margin (mm)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={options.pageMargin}
                        onChange={(e) => setOptions({ ...options, pageMargin: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Include Bleed (3mm)</Label>
                    <Switch
                      checked={options.includeBleed}
                      onCheckedChange={(checked) => setOptions({ ...options, includeBleed: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Crop Marks</Label>
                    <Switch
                      checked={options.includeCropMarks}
                      onCheckedChange={(checked) => setOptions({ ...options, includeCropMarks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Serial Numbers</Label>
                    <Switch
                      checked={options.showSerialNumbers}
                      onCheckedChange={(checked) => setOptions({ ...options, showSerialNumbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Page Numbers</Label>
                    <Switch
                      checked={options.showPageNumbers}
                      onCheckedChange={(checked) => setOptions({ ...options, showPageNumbers: checked })}
                    />
                  </div>

                  {hasBackSide && (
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Separate Front/Back</Label>
                      <Switch
                        checked={options.separateFrontBack}
                        onCheckedChange={(checked) => setOptions({ ...options, separateFrontBack: checked })}
                      />
                    </div>
                  )}
                </div>

                {/* Serial Number Options */}
                {options.showSerialNumbers && (
                  <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <Label className="text-xs font-medium">Serial Number Settings</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Prefix</Label>
                        <Input
                          type="text"
                          placeholder="e.g., ID-"
                          value={options.serialNumberPrefix}
                          onChange={(e) => setOptions({ ...options, serialNumberPrefix: e.target.value })}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start From</Label>
                        <Input
                          type="number"
                          min={1}
                          value={options.startingSerialNumber}
                          onChange={(e) => setOptions({ ...options, startingSerialNumber: parseInt(e.target.value) || 1 })}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {totalBatches > 1 
                        ? `Batch ${currentBatch} of ${totalBatches}...`
                        : 'Generating...'
                      }
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Generated PDFs */}
              {generatedPDFs.length > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    PDFs Generated Successfully
                  </div>
                  <div className="space-y-1">
                    {generatedPDFs.map((pdf, index) => (
                      <a
                        key={index}
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download {pdf.side === 'back' ? 'Back' : 'Front'} PDF {generatedPDFs.length > 2 ? `(Part ${Math.floor(index / 2) + 1})` : ''}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button 
                className="w-full" 
                onClick={handleGenerate}
                disabled={isGenerating || csvData.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate {csvData.length} PDFs
                  </>
                )}
              </Button>
            </>
          )}

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Use placeholders like {'{{name}}'} in your template</li>
              <li>Column names should match placeholders</li>
              <li>Click eye icon to preview a record</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
