import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, Loader2, Zap, Rocket } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { Progress } from '@/components/ui/progress';

interface PhotoUploadProps {
  onPhotosUploaded: (photos: { filename: string; blob: Blob }[]) => void;
}

const PROCESS_BATCH_SIZE = 500;

export function PhotoUpload({ onPhotosUploaded }: PhotoUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file containing photos');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProcessedCount(0);

    try {
      const startTime = performance.now();
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const imageFiles = Object.keys(contents.files).filter(filename => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext) && 
               !filename.startsWith('__MACOSX') && !contents.files[filename].dir;
      });

      if (imageFiles.length === 0) {
        setError('No image files found in ZIP');
        setIsProcessing(false);
        return;
      }

      setTotalCount(imageFiles.length);
      const photos: { filename: string; blob: Blob }[] = [];
      
      // Process in large parallel batches
      for (let i = 0; i < imageFiles.length; i += PROCESS_BATCH_SIZE) {
        const batch = imageFiles.slice(i, i + PROCESS_BATCH_SIZE);
        
        const batchPromises = batch.map(async (filename) => {
          const blob = await contents.files[filename].async('blob');
          return {
            filename: filename.split('/').pop() || filename,
            blob
          };
        });

        const batchResults = await Promise.all(batchPromises);
        photos.push(...batchResults);

        setProcessedCount(Math.min(i + batch.length, imageFiles.length));
        setProgress(Math.round((Math.min(i + batch.length, imageFiles.length) / imageFiles.length) * 100));
        
        // Yield to UI periodically
        if (i % 1000 === 0) await new Promise(r => setTimeout(r, 0));
      }

      const endTime = performance.now();
      onPhotosUploaded(photos);
      toast.success(`Extracted ${photos.length.toLocaleString()} photos in ${((endTime - startTime) / 1000).toFixed(1)}s`);
      setIsProcessing(false);
    } catch (err) {
      console.error('Failed to process ZIP:', err);
      setError('Failed to extract photos from ZIP file');
      setIsProcessing(false);
    }
  };

  const handleDirectUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProcessedCount(0);

    const startTime = performance.now();
    const fileArray = Array.from(files);
    setTotalCount(fileArray.length);

    const photos: { filename: string; blob: Blob }[] = fileArray.map(file => ({
      filename: file.name,
      blob: file
    }));

    setProcessedCount(fileArray.length);
    setProgress(100);

    const endTime = performance.now();
    onPhotosUploaded(photos);
    toast.success(`Loaded ${photos.length.toLocaleString()} photos in ${((endTime - startTime) / 1000).toFixed(1)}s`);
    setIsProcessing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Ultra-Fast Bulk Photo Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              {isProcessing ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">
                Upload 10,000+ photos instantly
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WEBP formats
              </p>
            </div>

            {isProcessing && (
              <div className="w-full max-w-sm space-y-2">
                <Progress value={progress} className="h-3" />
                <p className="text-sm font-medium text-center">
                  Processing: {processedCount.toLocaleString()} / {totalCount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
              </div>
            )}

            <div className="flex gap-2">
              <label htmlFor="zip-upload">
                <Button variant="default" disabled={isProcessing} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload ZIP
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

              <label htmlFor="photos-upload">
                <Button variant="outline" disabled={isProcessing} asChild>
                  <span>Select Photos</span>
                </Button>
              </label>
              <input
                id="photos-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleDirectUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Performance specs:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>500 files processed per batch</li>
            <li>Parallel extraction from ZIP</li>
            <li>Memory-efficient blob handling</li>
            <li>Photos matched by filename or roll number</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
