import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Image as ImageIcon } from 'lucide-react';

interface TemplatePreviewProps {
  designJson: unknown;
  width?: number;
  height?: number;
  className?: string;
}

export function TemplatePreview({ designJson, width = 200, height = 126, className = '' }: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designJson || typeof designJson !== 'object' || !canvasRef.current) {
      setLoading(false);
      return;
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 856,
      height: 540,
      backgroundColor: '#ffffff',
    });

    canvas.loadFromJSON(designJson).then(() => {
      canvas.requestRenderAll();
      
      // Generate data URL after a small delay to ensure rendering is complete
      setTimeout(() => {
        try {
          const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: 0.3, // Scale down for thumbnail
          });
          setImageUrl(dataUrl);
        } catch (e) {
          console.error('Failed to generate preview:', e);
        }
        setLoading(false);
        canvas.dispose();
      }, 100);
    }).catch(() => {
      setLoading(false);
      canvas.dispose();
    });

    return () => {
      canvas.dispose();
    };
  }, [designJson]);

  if (!designJson) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded border border-dashed ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No template</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded border animate-pulse ${className}`}
        style={{ width, height }}
      >
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Template preview"
          className={`object-contain rounded border bg-white ${className}`}
          style={{ width, height }}
        />
      ) : (
        <div 
          className={`flex items-center justify-center bg-muted rounded border ${className}`}
          style={{ width, height }}
        >
          <p className="text-xs text-muted-foreground">Preview failed</p>
        </div>
      )}
    </>
  );
}
