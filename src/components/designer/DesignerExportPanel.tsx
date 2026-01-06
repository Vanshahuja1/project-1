import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileImage, FileText, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export type ExportFormat = 'png' | 'jpg' | 'pdf';
export type ExportQuality = 'screen' | 'print' | 'high';

interface ExportSettings {
  format: ExportFormat;
  quality: ExportQuality;
  dpi: number;
  includeBleed: boolean;
  bleedMm: number;
  includeFront: boolean;
  includeBack: boolean;
  combinedPdf: boolean;
}

interface DesignerExportPanelProps {
  canvas: any;
  backCanvas?: any;
  templateName: string;
  hasBackSide: boolean;
  widthMm: number;
  heightMm: number;
}

const DPI_PRESETS = {
  screen: 72,
  print: 300,
  high: 600,
};

export function DesignerExportPanel({
  canvas,
  backCanvas,
  templateName,
  hasBackSide,
  widthMm,
  heightMm,
}: DesignerExportPanelProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    quality: 'print',
    dpi: 300,
    includeBleed: false,
    bleedMm: 3,
    includeFront: true,
    includeBack: hasBackSide,
    combinedPdf: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleQualityChange = (quality: ExportQuality) => {
    setSettings(prev => ({
      ...prev,
      quality,
      dpi: DPI_PRESETS[quality],
    }));
  };

  const getMultiplier = () => {
    // Base canvas is at 96 DPI (3.78 px/mm)
    // For target DPI, we need to scale appropriately
    const baseDpi = 96;
    return settings.dpi / baseDpi;
  };

  const exportAsImage = async (format: 'png' | 'jpg') => {
    if (!canvas) return;

    const multiplier = getMultiplier();
    const dataUrl = canvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : 'png',
      quality: format === 'jpg' ? 0.95 : 1,
      multiplier,
    });

    const link = document.createElement('a');
    link.download = `${templateName}-front.${format}`;
    link.href = dataUrl;
    link.click();

    if (settings.includeBack && hasBackSide && backCanvas) {
      const backDataUrl = backCanvas.toDataURL({
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: format === 'jpg' ? 0.95 : 1,
        multiplier,
      });
      const backLink = document.createElement('a');
      backLink.download = `${templateName}-back.${format}`;
      backLink.href = backDataUrl;
      setTimeout(() => backLink.click(), 500);
    }

    toast.success(`Exported as ${format.toUpperCase()} at ${settings.dpi} DPI`);
  };

  const exportAsPdf = async () => {
    if (!canvas) return;

    const multiplier = getMultiplier();
    const orientation = widthMm > heightMm ? 'landscape' : 'portrait';
    
    // Add bleed if enabled
    const bleed = settings.includeBleed ? settings.bleedMm : 0;
    const totalWidth = widthMm + (bleed * 2);
    const totalHeight = heightMm + (bleed * 2);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [totalWidth, totalHeight],
    });

    // Front side
    if (settings.includeFront) {
      const frontDataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier,
      });
      pdf.addImage(frontDataUrl, 'PNG', bleed, bleed, widthMm, heightMm);
    }

    // Back side
    if (settings.includeBack && hasBackSide && backCanvas) {
      if (settings.includeFront) {
        pdf.addPage([totalWidth, totalHeight], orientation);
      }
      const backDataUrl = backCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier,
      });
      pdf.addImage(backDataUrl, 'PNG', bleed, bleed, widthMm, heightMm);
    }

    pdf.save(`${templateName}.pdf`);
    toast.success(`Exported as PDF at ${settings.dpi} DPI`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      switch (settings.format) {
        case 'png':
        case 'jpg':
          await exportAsImage(settings.format);
          break;
        case 'pdf':
          await exportAsPdf();
          break;
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Tabs value={settings.format} onValueChange={(v) => setSettings(prev => ({ ...prev, format: v as ExportFormat }))}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="png" className="flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5" />
                  PNG
                </TabsTrigger>
                <TabsTrigger value="jpg" className="flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5" />
                  JPG
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          {/* Quality Presets */}
          <div className="space-y-2">
            <Label>Quality Preset</Label>
            <Select value={settings.quality} onValueChange={(v) => handleQualityChange(v as ExportQuality)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screen">Screen (72 DPI)</SelectItem>
                <SelectItem value="print">Print Ready (300 DPI)</SelectItem>
                <SelectItem value="high">High Quality (600 DPI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom DPI */}
          <div className="space-y-2">
            <Label>Resolution: {settings.dpi} DPI</Label>
            <Slider
              value={[settings.dpi]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, dpi: v, quality: 'screen' }))}
              min={72}
              max={600}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Higher DPI = better quality for printing, larger file size
            </p>
          </div>

          <Separator />

          {/* PDF-specific options */}
          {settings.format === 'pdf' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="bleed">Include Bleed Margin</Label>
                <Switch
                  id="bleed"
                  checked={settings.includeBleed}
                  onCheckedChange={(v) => setSettings(prev => ({ ...prev, includeBleed: v }))}
                />
              </div>
              
              {settings.includeBleed && (
                <div className="space-y-2">
                  <Label>Bleed Size: {settings.bleedMm}mm</Label>
                  <Slider
                    value={[settings.bleedMm]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, bleedMm: v }))}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                </div>
              )}
            </div>
          )}

          {/* Side Selection */}
          {hasBackSide && (
            <div className="space-y-3">
              <Label>Export Sides</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="front"
                    checked={settings.includeFront}
                    onCheckedChange={(v) => setSettings(prev => ({ ...prev, includeFront: v }))}
                  />
                  <Label htmlFor="front" className="text-sm">Front</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="back"
                    checked={settings.includeBack}
                    onCheckedChange={(v) => setSettings(prev => ({ ...prev, includeBack: v }))}
                  />
                  <Label htmlFor="back" className="text-sm">Back</Label>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Export Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <p><strong>Format:</strong> {settings.format.toUpperCase()}</p>
            <p><strong>Resolution:</strong> {settings.dpi} DPI</p>
            <p><strong>Dimensions:</strong> {widthMm}×{heightMm}mm</p>
            {settings.includeBleed && settings.format === 'pdf' && (
              <p><strong>With Bleed:</strong> {widthMm + settings.bleedMm * 2}×{heightMm + settings.bleedMm * 2}mm</p>
            )}
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport} 
            disabled={isExporting || (!settings.includeFront && !settings.includeBack)}
          >
            {isExporting ? 'Exporting...' : 'Export'}
            <Printer className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
