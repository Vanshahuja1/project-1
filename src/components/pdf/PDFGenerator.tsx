import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { FileText, Download, Loader2, CheckCircle2, Grid3X3, RotateCw, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TemplatePreview } from './TemplatePreview';

interface PDFGeneratorProps {
  projectId: string;
  templateData: any;
  records: any[];
}

// Standard page sizes in mm
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

// Maximum records per batch to avoid CPU timeout
const BATCH_SIZE = 25;

export function PDFGenerator({ projectId, templateData, records }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [generatedPDFs, setGeneratedPDFs] = useState<{ side: string; url: string }[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [options, setOptions] = useState({
    includeBleed: true,
    includeCropMarks: true,
    includeColorBars: true,
    format: 'single' as 'single' | 'separate' | 'bookmarked',
    pageSize: 'A4' as 'A4' | 'A3' | 'Letter' | 'card',
    orientation: 'portrait' as 'portrait' | 'landscape',
    cardsPerRow: 0,
    cardsPerColumn: 0,
    cardSpacing: 5,
    pageMargin: 10,
    separateFrontBack: false,
    side: 'both' as 'front' | 'back' | 'both',
  });

  // Calculate preview info
  const previewInfo = useMemo(() => {
    if (!templateData) return null;

    const cardWidthMm = templateData.width_mm || 85.6;
    const cardHeightMm = templateData.height_mm || 54;
    const bleedMm = options.includeBleed ? 3 : 0;
    const cardWidthWithBleed = cardWidthMm + bleedMm * 2;
    const cardHeightWithBleed = cardHeightMm + bleedMm * 2;

    if (options.pageSize === 'card') {
      return {
        cardsPerRow: 1,
        cardsPerColumn: 1,
        cardsPerPage: 1,
        totalPages: records.length,
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
    const totalPages = Math.ceil(records.length / cardsPerPage);

    return {
      cardsPerRow,
      cardsPerColumn,
      cardsPerPage,
      totalPages,
      pageWidth,
      pageHeight,
      cardWidth: cardWidthWithBleed,
      cardHeight: cardHeightWithBleed,
    };
  }, [templateData, options, records.length]);

  const hasBackSide = templateData?.has_back_side && templateData?.back_design_json;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedPDFs([]);
    setStats(null);

    try {
      const numBatches = Math.ceil(records.length / BATCH_SIZE);
      setTotalBatches(numBatches);
      
      toast.info(`Starting PDF generation for ${records.length} cards in ${numBatches} batch${numBatches > 1 ? 'es' : ''}...`);

      const allResults: { side: string; url: string }[] = [];
      let totalRecordsProcessed = 0;
      let totalPagesGenerated = 0;
      let totalDuration = 0;

      // Process batches sequentially to avoid overwhelming the server
      for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        setCurrentBatch(batchIndex + 1);
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, records.length);
        const batchRecords = records.slice(start, end);

        const { data, error } = await supabase.functions.invoke('generate-pdf', {
          body: {
            projectId,
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

        // Collect results
        if (data.urls) {
          allResults.push(...data.urls);
        } else if (data.url) {
          allResults.push({ side: 'front', url: data.url });
        }

        totalRecordsProcessed += data.recordsProcessed || 0;
        totalPagesGenerated += data.pagesGenerated || 0;
        totalDuration += data.duration || 0;

        // Update progress
        const progressPercent = Math.round(((batchIndex + 1) / numBatches) * 100);
        setProgress(progressPercent);
      }

      setGeneratedPDFs(allResults);
      setStats({
        recordsProcessed: totalRecordsProcessed,
        pagesGenerated: totalPagesGenerated,
        batches: numBatches,
        duration: totalDuration.toFixed(1),
        cardsPerSecond: Math.round(totalRecordsProcessed / totalDuration),
      });

      toast.success(`PDF generated successfully! ${totalPagesGenerated} pages in ${numBatches} batch${numBatches > 1 ? 'es' : ''}`);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Print-Ready PDFs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Design Preview */}
        <TemplatePreview 
          templateData={templateData} 
          sampleRecord={records[0]} 
          scale={0.8}
          projectId={projectId}
        />

        {/* Visual Layout Preview */}
        {previewInfo && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <Grid3X3 className="h-4 w-4" />
              Layout Preview
            </div>
            <div className="flex gap-6">
              {/* Visual Grid Preview */}
              <div 
                className="relative bg-white border rounded shadow-sm flex items-center justify-center"
                style={{ 
                  width: '120px', 
                  height: options.pageSize === 'card' ? '80px' : (options.orientation === 'landscape' ? '85px' : '120px'),
                }}
              >
                <div 
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${previewInfo.cardsPerRow}, 1fr)`,
                    gridTemplateRows: `repeat(${previewInfo.cardsPerColumn}, 1fr)`,
                    padding: '4px',
                    width: '90%',
                    height: '90%',
                  }}
                >
                  {Array.from({ length: Math.min(previewInfo.cardsPerPage, 20) }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-primary/20 border border-primary/40 rounded-sm"
                    />
                  ))}
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Cards per row:</span>
                  <span className="ml-2 font-medium">{previewInfo.cardsPerRow}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cards per column:</span>
                  <span className="ml-2 font-medium">{previewInfo.cardsPerColumn}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cards per page:</span>
                  <span className="ml-2 font-medium">{previewInfo.cardsPerPage}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total pages:</span>
                  <span className="ml-2 font-medium">{previewInfo.totalPages}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Page size:</span>
                  <span className="ml-2 font-medium">
                    {previewInfo.pageWidth.toFixed(1)} × {previewInfo.pageHeight.toFixed(1)} mm
                  </span>
                </div>
                {records.length > BATCH_SIZE && (
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Will be processed in {Math.ceil(records.length / BATCH_SIZE)} batches
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Layout Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Grid3X3 className="h-4 w-4" />
            Page Layout
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Page Size</Label>
              <Select
                value={options.pageSize}
                onValueChange={(value: any) => setOptions({ ...options, pageSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210×297mm)</SelectItem>
                  <SelectItem value="A3">A3 (297×420mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5×11in)</SelectItem>
                  <SelectItem value="card">Single Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <RotateCw className="h-3 w-3" />
                Orientation
              </Label>
              <Select
                value={options.orientation}
                onValueChange={(value: any) => setOptions({ ...options, orientation: value })}
                disabled={options.pageSize === 'card'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Output Format</Label>
              <Select
                value={options.format}
                onValueChange={(value: any) => setOptions({ ...options, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single PDF</SelectItem>
                  <SelectItem value="bookmarked">With Bookmarks</SelectItem>
                  <SelectItem value="separate">Separate per Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {options.pageSize !== 'card' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Cards/Row (0=Auto)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={options.cardsPerRow}
                  onChange={(e) => setOptions({ ...options, cardsPerRow: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Cards/Col (0=Auto)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={options.cardsPerColumn}
                  onChange={(e) => setOptions({ ...options, cardsPerColumn: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Spacing (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={options.cardSpacing}
                  onChange={(e) => setOptions({ ...options, cardSpacing: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Margin (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={options.pageMargin}
                  onChange={(e) => setOptions({ ...options, pageMargin: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Front/Back Options */}
        {hasBackSide && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4" />
              Double-Sided Printing
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Generate separate front/back PDFs</Label>
              <Switch
                checked={options.separateFrontBack}
                onCheckedChange={(checked) => setOptions({ ...options, separateFrontBack: checked })}
              />
            </div>

            {options.separateFrontBack && (
              <div className="space-y-2">
                <Label className="text-sm">Generate sides</Label>
                <Select
                  value={options.side}
                  onValueChange={(value: any) => setOptions({ ...options, side: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Front + Back PDFs)</SelectItem>
                    <SelectItem value="front">Front Only</SelectItem>
                    <SelectItem value="back">Back Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Print Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Include Bleed (3mm)</Label>
            <Switch
              checked={options.includeBleed}
              onCheckedChange={(checked) => setOptions({ ...options, includeBleed: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Crop Marks</Label>
            <Switch
              checked={options.includeCropMarks}
              onCheckedChange={(checked) => setOptions({ ...options, includeCropMarks: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Color Bars</Label>
            <Switch
              checked={options.includeColorBars}
              onCheckedChange={(checked) => setOptions({ ...options, includeColorBars: checked })}
            />
          </div>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {totalBatches > 1 
                  ? `Processing batch ${currentBatch} of ${totalBatches}...`
                  : 'Generating PDF...'
                }
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium text-sm">Generation Complete!</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Records</div>
                <div className="font-medium">{stats.recordsProcessed}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Pages</div>
                <div className="font-medium">{stats.pagesGenerated}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Batches</div>
                <div className="font-medium">{stats.batches}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Speed</div>
                <div className="font-medium">{stats.cardsPerSecond} cards/s</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            onClick={handleGenerate}
            disabled={isGenerating || records.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF ({records.length} cards)
              </>
            )}
          </Button>

          {generatedPDFs.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {generatedPDFs.map((pdf, idx) => (
                <Button
                  key={`${pdf.side}-${idx}`}
                  variant="outline"
                  onClick={() => window.open(pdf.url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatedPDFs.length > 1 ? `Batch ${idx + 1}` : 'Download'}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
