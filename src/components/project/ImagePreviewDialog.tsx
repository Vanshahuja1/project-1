import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Eraser, Download, Loader2, Crop, RotateCcw, Sun, Contrast, Palette, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  originalPhotoUrl: string | null;
  recordId: string;
  projectId: string;
  recordName: string;
}

// Passport photo sizes in mm (width x height)
const PASSPORT_SIZES = {
  india: { width: 35, height: 45, name: 'Indian Passport (35x45mm)' },
  us: { width: 51, height: 51, name: 'US Passport (51x51mm)' },
  uk: { width: 35, height: 45, name: 'UK Passport (35x45mm)' },
  schengen: { width: 35, height: 45, name: 'Schengen Visa (35x45mm)' },
};

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  originalPhotoUrl,
  recordId,
  projectId,
  recordName,
}: ImagePreviewDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Image adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset adjustments when dialog opens
  useEffect(() => {
    if (open) {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setProcessedUrl(null);
    }
  }, [open]);

  const applyFilters = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    
    // Apply CSS filters via canvas
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png', 1.0);
  };

  const handleApplyAdjustments = async () => {
    const currentUrl = processedUrl || imageUrl;
    if (!currentUrl) return;

    setIsApplying(true);
    toast.info('Applying adjustments...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentUrl;
      });

      const adjustedDataUrl = applyFilters(img);
      
      // Convert to blob
      const response = await fetch(adjustedDataUrl);
      const resultBlob = await response.blob();

      // Upload to storage
      const fileName = `${projectId}/${recordId}_adjusted_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, resultBlob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      // Update the record
      const { error: updateError } = await supabase
        .from('data_records')
        .update({
          photo_url: publicUrl,
          original_photo_url: originalPhotoUrl || imageUrl,
          processing_status: 'processed',
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      setProcessedUrl(adjustedDataUrl);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Adjustments applied successfully!');
    } catch (error) {
      console.error('Apply adjustments failed:', error);
      toast.error('Failed to apply adjustments');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePassportCrop = async (size: keyof typeof PASSPORT_SIZES) => {
    const currentUrl = processedUrl || imageUrl;
    if (!currentUrl) return;

    setIsCropping(true);
    const passportSize = PASSPORT_SIZES[size];
    toast.info(`Cropping to ${passportSize.name}...`);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Calculate aspect ratio for passport size
      const targetAspect = passportSize.width / passportSize.height;
      const sourceAspect = img.width / img.height;
      
      let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
      
      if (sourceAspect > targetAspect) {
        // Image is wider than target - crop sides
        sourceWidth = img.height * targetAspect;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Image is taller than target - crop from top (keep face area)
        sourceHeight = img.width / targetAspect;
        sourceY = img.height * 0.1; // Start slightly from top to capture face
      }
      
      // Output at 300 DPI (standard for passport photos)
      const dpi = 300;
      const outputWidth = Math.round((passportSize.width / 25.4) * dpi);
      const outputHeight = Math.round((passportSize.height / 25.4) * dpi);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // Apply current filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
      
      const croppedDataUrl = canvas.toDataURL('image/png', 1.0);
      setProcessedUrl(croppedDataUrl);

      // Upload to storage
      const response = await fetch(croppedDataUrl);
      const resultBlob = await response.blob();

      const fileName = `${projectId}/${recordId}_passport_${size}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, resultBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('data_records')
        .update({
          photo_url: publicUrl,
          original_photo_url: originalPhotoUrl || imageUrl,
          processing_status: 'processed',
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success(`Cropped to ${passportSize.name}!`);
    } catch (error) {
      console.error('Passport crop failed:', error);
      toast.error('Failed to crop image');
    } finally {
      setIsCropping(false);
    }
  };

  const handleFaceCrop = async () => {
    if (!imageUrl) return;

    setIsCropping(true);
    toast.info('Detecting and cropping face...');

    try {
      const { detectAndCropFace } = await import('@/lib/faceDetection');
      const { croppedImageUrl, coordinates } = await detectAndCropFace(imageUrl);

      setProcessedUrl(croppedImageUrl);

      const response = await fetch(croppedImageUrl);
      const resultBlob = await response.blob();

      const fileName = `${projectId}/${recordId}_face_cropped_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, resultBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('data_records')
        .update({
          cropped_photo_url: publicUrl,
          original_photo_url: originalPhotoUrl || imageUrl,
          face_detected: true,
          face_crop_coordinates: coordinates,
          processing_status: 'processed',
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Face cropped successfully!');
    } catch (error) {
      console.error('Face crop failed:', error);
      toast.error('Failed to detect/crop face');
    } finally {
      setIsCropping(false);
    }
  };

  const handleResetToOriginal = async () => {
    if (!originalPhotoUrl) {
      toast.error('No original photo available');
      return;
    }

    setIsResetting(true);
    toast.info('Restoring original photo...');

    try {
      const { error: updateError } = await supabase
        .from('data_records')
        .update({
          photo_url: originalPhotoUrl,
          background_removed: false,
          face_detected: false,
          cropped_photo_url: null,
          face_crop_coordinates: null,
          processing_status: 'pending',
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      setProcessedUrl(null);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Photo restored to original!');
    } catch (error) {
      console.error('Reset failed:', error);
      toast.error('Failed to restore original photo');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageUrl) return;

    setIsRemoving(true);
    toast.info('Removing background... This may take a moment.');

    try {
      const { removeBackground } = await import('@/lib/backgroundRemoval');
      const resultDataUrl = await removeBackground(imageUrl);

      setProcessedUrl(resultDataUrl);

      const response = await fetch(resultDataUrl);
      const resultBlob = await response.blob();

      const fileName = `${projectId}/${recordId}_bg_removed_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, resultBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('data_records')
        .update({
          photo_url: publicUrl,
          original_photo_url: originalPhotoUrl || imageUrl,
          background_removed: true,
          processing_status: 'processed',
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Background removal failed:', error);
      toast.error('Failed to remove background');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDownload = () => {
    const urlToDownload = processedUrl || imageUrl;
    if (!urlToDownload) return;

    const a = document.createElement('a');
    a.href = urlToDownload;
    a.download = `${recordName}_photo.png`;
    a.click();
  };

  const handleClose = () => {
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
      setProcessedUrl(null);
    }
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    onOpenChange(false);
  };

  const displayUrl = processedUrl || imageUrl;
  const hasOriginal = originalPhotoUrl && originalPhotoUrl !== imageUrl;
  const hasAdjustments = brightness !== 100 || contrast !== 100 || saturation !== 100;

  // CSS filter string for preview
  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recordName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative flex items-center justify-center bg-muted/30 rounded-lg min-h-[250px] p-4">
            {displayUrl ? (
              <img
                ref={imageRef}
                src={displayUrl}
                alt={recordName}
                className="max-w-full max-h-[300px] object-contain rounded-lg"
                style={filterStyle}
                crossOrigin="anonymous"
              />
            ) : (
              <p className="text-muted-foreground">No image available</p>
            )}
          </div>

          {/* Image Adjustments */}
          <div className="grid gap-4 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Image Adjustments
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Sun className="h-3 w-3" />
                    Brightness
                  </Label>
                  <span className="text-xs text-muted-foreground">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Contrast className="h-3 w-3" />
                    Contrast
                  </Label>
                  <span className="text-xs text-muted-foreground">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={50}
                  max={150}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Saturation
                  </Label>
                  <span className="text-xs text-muted-foreground">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  onValueChange={([v]) => setSaturation(v)}
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            {hasAdjustments && (
              <Button
                size="sm"
                onClick={handleApplyAdjustments}
                disabled={isApplying}
                className="w-fit"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Adjustments'
                )}
              </Button>
            )}
          </div>

          {/* Passport Crop Options */}
          <div className="grid gap-2 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Passport Size Crop
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PASSPORT_SIZES).map(([key, size]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePassportCrop(key as keyof typeof PASSPORT_SIZES)}
                  disabled={isCropping || !imageUrl}
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            {hasOriginal && (
              <Button
                variant="outline"
                onClick={handleResetToOriginal}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset to Original
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!displayUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handleFaceCrop}
              disabled={isCropping || !imageUrl}
            >
              {isCropping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cropping...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4 mr-2" />
                  Face Crop
                </>
              )}
            </Button>
            <Button
              onClick={handleRemoveBackground}
              disabled={isRemoving || !imageUrl}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Eraser className="h-4 w-4 mr-2" />
                  Remove BG
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
