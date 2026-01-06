import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Barcode, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { 
  generateQRCodeDataUrl, 
  generateBarcodeDataUrl, 
  BarcodeFormat,
  getPlaceholderData 
} from '@/lib/codeGenerators';

interface DesignerCodeGeneratorProps {
  onAddCode: (dataUrl: string, type: 'qr' | 'barcode', config: any) => void;
}

const BARCODE_FORMATS: { value: BarcodeFormat; label: string }[] = [
  { value: 'CODE128', label: 'Code 128' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'UPC', label: 'UPC' },
  { value: 'ITF14', label: 'ITF-14' },
];

export function DesignerCodeGenerator({ onAddCode }: DesignerCodeGeneratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'barcode'>('qr');
  
  // QR Code settings
  const [qrData, setQrData] = useState('https://example.com');
  const [qrSize, setQrSize] = useState(200);
  const [qrDarkColor, setQrDarkColor] = useState('#000000');
  const [qrLightColor, setQrLightColor] = useState('#ffffff');
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  
  // Barcode settings
  const [barcodeData, setBarcodeData] = useState('ID12345');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(50);
  const [barcodeShowValue, setBarcodeShowValue] = useState(true);
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // Generate QR preview
  useEffect(() => {
    if (activeTab === 'qr' && qrData) {
      generateQRCodeDataUrl(qrData, {
        width: qrSize,
        color: { dark: qrDarkColor, light: qrLightColor },
      }).then(setQrPreview).catch(() => setQrPreview(null));
    }
  }, [activeTab, qrData, qrSize, qrDarkColor, qrLightColor]);

  // Generate barcode preview
  useEffect(() => {
    if (activeTab === 'barcode' && barcodeData) {
      generateBarcodeDataUrl(barcodeData, {
        format: barcodeFormat,
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: barcodeShowValue,
      }).then(setBarcodePreview).catch(() => setBarcodePreview(null));
    }
  }, [activeTab, barcodeData, barcodeFormat, barcodeWidth, barcodeHeight, barcodeShowValue]);

  const handleFormatChange = (format: BarcodeFormat) => {
    setBarcodeFormat(format);
    setBarcodeData(getPlaceholderData(format));
  };

  const handleAddQRCode = async () => {
    if (!qrData.trim()) {
      toast.error('Please enter data for the QR code');
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateQRCodeDataUrl(qrData, {
        width: qrSize,
        color: { dark: qrDarkColor, light: qrLightColor },
      });
      
      onAddCode(dataUrl, 'qr', {
        data: qrData,
        size: qrSize,
        darkColor: qrDarkColor,
        lightColor: qrLightColor,
      });
      
      toast.success('QR Code added to canvas');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddBarcode = async () => {
    if (!barcodeData.trim()) {
      toast.error('Please enter data for the barcode');
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateBarcodeDataUrl(barcodeData, {
        format: barcodeFormat,
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: barcodeShowValue,
      });
      
      onAddCode(dataUrl, 'barcode', {
        data: barcodeData,
        format: barcodeFormat,
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: barcodeShowValue,
      });
      
      toast.success('Barcode added to canvas');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate barcode. Check data format.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <QrCode className="h-4 w-4 mr-1" />
          Add Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate QR Code / Barcode</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'qr' | 'barcode')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="qr" className="flex items-center gap-1">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="barcode" className="flex items-center gap-1">
              <Barcode className="h-4 w-4" />
              Barcode
            </TabsTrigger>
          </TabsList>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Data / URL</Label>
              <Input
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Enter URL or text"
              />
            </div>

            <div className="space-y-2">
              <Label>Size: {qrSize}px</Label>
              <Slider
                value={[qrSize]}
                onValueChange={([v]) => setQrSize(v)}
                min={50}
                max={400}
                step={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dark Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={qrDarkColor}
                    onChange={(e) => setQrDarkColor(e.target.value)}
                    className="w-10 h-8 p-0.5"
                  />
                  <Input
                    value={qrDarkColor}
                    onChange={(e) => setQrDarkColor(e.target.value)}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Light Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={qrLightColor}
                    onChange={(e) => setQrLightColor(e.target.value)}
                    className="w-10 h-8 p-0.5"
                  />
                  <Input
                    value={qrLightColor}
                    onChange={(e) => setQrLightColor(e.target.value)}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* QR Preview */}
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              {qrPreview ? (
                <img src={qrPreview} alt="QR Preview" className="max-w-[150px]" />
              ) : (
                <div className="text-sm text-muted-foreground">Preview will appear here</div>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddQRCode}
              disabled={isGenerating || !qrData.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add QR Code to Canvas
            </Button>
          </TabsContent>

          {/* Barcode Tab */}
          <TabsContent value="barcode" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={barcodeFormat} onValueChange={(v) => handleFormatChange(v as BarcodeFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                value={barcodeData}
                onChange={(e) => setBarcodeData(e.target.value)}
                placeholder="Enter barcode data"
              />
              <p className="text-xs text-muted-foreground">
                Format requirements vary. CODE128 accepts any text.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bar Width: {barcodeWidth}px</Label>
                <Slider
                  value={[barcodeWidth]}
                  onValueChange={([v]) => setBarcodeWidth(v)}
                  min={1}
                  max={5}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label>Height: {barcodeHeight}px</Label>
                <Slider
                  value={[barcodeHeight]}
                  onValueChange={([v]) => setBarcodeHeight(v)}
                  min={30}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showValue"
                checked={barcodeShowValue}
                onChange={(e) => setBarcodeShowValue(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showValue" className="text-sm">Show value below barcode</Label>
            </div>

            {/* Barcode Preview */}
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              {barcodePreview ? (
                <img src={barcodePreview} alt="Barcode Preview" className="max-w-full" />
              ) : (
                <div className="text-sm text-muted-foreground">Preview will appear here</div>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddBarcode}
              disabled={isGenerating || !barcodeData.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Barcode to Canvas
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
