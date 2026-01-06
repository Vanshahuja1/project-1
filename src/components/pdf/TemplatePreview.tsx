import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TemplatePreviewProps {
  templateData: any;
  sampleRecord?: any;
  scale?: number;
  projectId?: string;
}

// Parse Fabric.js color to CSS
function parseColor(fill: any): string {
  if (!fill) return 'transparent';
  if (typeof fill === 'string') return fill;
  if (fill.type === 'linear' || fill.type === 'radial') {
    // Handle gradients
    const stops = fill.colorStops?.map((stop: any) => 
      `${stop.color} ${(stop.offset * 100).toFixed(0)}%`
    ).join(', ');
    return fill.type === 'linear' 
      ? `linear-gradient(${fill.coords?.x2 === 1 ? '90deg' : '180deg'}, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  }
  return 'transparent';
}

// Replace variable placeholders with actual data
function replaceVariables(text: string, dataJson: any, record: any): string {
  if (!text) return '';
  return text.replace(/\{\{(.+?)\}\}/g, (_match, fieldName) => {
    const field = fieldName.trim();
    // Check various sources for the value
    const value = dataJson?.[field] || 
                  record?.[field] || 
                  record?.data_json?.[field] ||
                  `{{${field}}}`;
    return value;
  });
}

// Helper to convert filename to Supabase Storage public URL
function resolvePhotoUrl(photoValue: string | null | undefined, projectId?: string): string | null {
  if (!photoValue) return null;
  
  // Already a full URL or data URI
  if (photoValue.startsWith('http://') || photoValue.startsWith('https://') || photoValue.startsWith('data:')) {
    return photoValue;
  }
  
  // It's a filename - construct Supabase Storage URL
  if (projectId) {
    const { data: { publicUrl } } = supabase.storage
      .from('project-photos')
      .getPublicUrl(`${projectId}/${photoValue}`);
    return publicUrl;
  }
  
  return null;
}

export function TemplatePreview({ templateData, sampleRecord, scale = 1, projectId }: TemplatePreviewProps) {
  const designJson = templateData?.design_json;
  const canvasWidth = designJson?.canvasWidth || templateData?.canvas_width || 340;
  const canvasHeight = designJson?.canvasHeight || templateData?.canvas_height || 214;
  
  const dataJson = sampleRecord?.data_json || sampleRecord || {};

  const renderedObjects = useMemo(() => {
    if (!designJson?.objects) return [];

    return designJson.objects.map((obj: any, index: number) => {
      const objType = (obj.type || '').toLowerCase();
      const left = (obj.left || 0) * scale;
      const top = (obj.top || 0) * scale;
      const scaleX = (obj.scaleX || 1) * scale;
      const scaleY = (obj.scaleY || 1) * scale;
      const width = (obj.width || 100) * scaleX;
      const height = (obj.height || 100) * scaleY;
      const angle = obj.angle || 0;

      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: angle ? `rotate(${angle}deg)` : undefined,
        transformOrigin: 'top left',
      };

      // Handle text objects
      if (objType === 'textbox' || objType === 'i-text' || objType === 'text') {
        const text = replaceVariables(obj.text || '', dataJson, sampleRecord);
        const fontSize = (obj.fontSize || 12) * scaleY;
        
        return (
          <div
            key={index}
            style={{
              ...baseStyle,
              width: `${width}px`,
              fontSize: `${fontSize}px`,
              fontFamily: obj.fontFamily || 'sans-serif',
              fontWeight: obj.fontWeight || 'normal',
              fontStyle: obj.fontStyle || 'normal',
              color: typeof obj.fill === 'string' ? obj.fill : '#000000',
              textAlign: obj.textAlign || 'left',
              lineHeight: obj.lineHeight || 1.2,
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
            }}
          >
            {text}
          </div>
        );
      }

      // Handle rectangles (including photo placeholders)
      if (objType === 'rect') {
        // Check for photo placeholder - supports both old (isVariableField) and new (data.isPhoto) formats
        const isPhotoPlaceholder = 
          (obj.isVariableField && obj.variableType === 'photo') || 
          obj.data?.isPhoto === true;
        
        if (isPhotoPlaceholder) {
          // Check multiple sources for photo URL - record level first, then data_json
          const rawPhotoUrl = sampleRecord?.cropped_photo_url || 
                          sampleRecord?.photo_url || 
                          dataJson?.photo_url || 
                          dataJson?.photo ||
                          dataJson?.profilePic;
          
          // Resolve to full URL if it's just a filename
          const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId);
          const isValidUrl = !!photoUrl;
          
          return (
            <div
              key={index}
              style={{
                ...baseStyle,
                width: `${width}px`,
                height: `${height}px`,
                borderRadius: `${(obj.rx || 0) * scaleX}px`,
                overflow: 'hidden',
                backgroundColor: isValidUrl ? 'transparent' : 'hsl(var(--muted))',
                border: isValidUrl ? 'none' : '1px dashed hsl(var(--border))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isValidUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Photo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">Photo</span>
              )}
            </div>
          );
        }

        return (
          <div
            key={index}
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              background: parseColor(obj.fill),
              borderRadius: `${(obj.rx || 0) * scaleX}px`,
              border: obj.stroke ? `${(obj.strokeWidth || 1) * scale}px solid ${obj.stroke}` : undefined,
              opacity: obj.opacity ?? 1,
            }}
          />
        );
      }

      // Handle images
      if (objType === 'image') {
        return (
          <img
            key={index}
            src={obj.src}
            alt=""
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              objectFit: 'contain',
              opacity: obj.opacity ?? 1,
            }}
          />
        );
      }

      // Handle circles/ellipses
      if (objType === 'circle' || objType === 'ellipse') {
        const rx = (obj.rx || obj.radius || 50) * scaleX;
        const ry = (obj.ry || obj.radius || 50) * scaleY;
        
        // Check for photo placeholder
        const isPhotoPlaceholder = obj.data?.isPhoto === true;
        
        if (isPhotoPlaceholder) {
          const rawPhotoUrl = sampleRecord?.cropped_photo_url || 
                          sampleRecord?.photo_url || 
                          dataJson?.photo_url || 
                          dataJson?.photo ||
                          dataJson?.profilePic;
          const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId);
          const isValidUrl = !!photoUrl;
          
          return (
            <div
              key={index}
              style={{
                ...baseStyle,
                width: `${rx * 2}px`,
                height: `${ry * 2}px`,
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: isValidUrl ? 'transparent' : 'hsl(var(--muted))',
                border: isValidUrl ? 'none' : '1px dashed hsl(var(--border))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isValidUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Photo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">Photo</span>
              )}
            </div>
          );
        }
        
        return (
          <div
            key={index}
            style={{
              ...baseStyle,
              width: `${rx * 2}px`,
              height: `${ry * 2}px`,
              borderRadius: '50%',
              background: parseColor(obj.fill),
              border: obj.stroke ? `${(obj.strokeWidth || 1) * scale}px solid ${obj.stroke}` : undefined,
              opacity: obj.opacity ?? 1,
            }}
          />
        );
      }

      // Handle polygons (hexagon, star, pentagon, etc.)
      if (objType === 'polygon') {
        const isPhotoPlaceholder = obj.data?.isPhoto === true;
        
        if (isPhotoPlaceholder) {
          const rawPhotoUrl = sampleRecord?.cropped_photo_url || 
                          sampleRecord?.photo_url || 
                          dataJson?.photo_url || 
                          dataJson?.photo ||
                          dataJson?.profilePic;
          const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId);
          const isValidUrl = !!photoUrl;
          
          return (
            <div
              key={index}
              style={{
                ...baseStyle,
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'hidden',
                backgroundColor: isValidUrl ? 'transparent' : 'hsl(var(--muted))',
                border: isValidUrl ? 'none' : '1px dashed hsl(var(--border))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isValidUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Photo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">Photo</span>
              )}
            </div>
          );
        }
        
        return (
          <div
            key={index}
            style={{
              ...baseStyle,
              width: `${width}px`,
              height: `${height}px`,
              background: parseColor(obj.fill),
              border: obj.stroke ? `${(obj.strokeWidth || 1) * scale}px solid ${obj.stroke}` : undefined,
              opacity: obj.opacity ?? 1,
            }}
          />
        );
      }

      // Handle lines
      if (objType === 'line') {
        const x1 = obj.x1 || 0;
        const y1 = obj.y1 || 0;
        const x2 = obj.x2 || 100;
        const y2 = obj.y2 || 0;
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * scale;
        const lineAngle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        
        return (
          <div
            key={index}
            style={{
              ...baseStyle,
              width: `${length}px`,
              height: `${(obj.strokeWidth || 1) * scale}px`,
              backgroundColor: obj.stroke || '#000000',
              transform: `rotate(${lineAngle + angle}deg)`,
              transformOrigin: 'left center',
            }}
          />
        );
      }

      return null;
    });
  }, [designJson, dataJson, sampleRecord, scale, projectId]);

  if (!templateData || !designJson) {
    return (
      <div className="flex items-center justify-center h-32 bg-muted/50 rounded-lg border border-dashed">
        <span className="text-sm text-muted-foreground">No template design available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4" />
        Template Preview
      </div>
      <div className="flex justify-center p-4 bg-muted/30 rounded-lg border overflow-auto">
        <div
          className="relative bg-white shadow-md"
          style={{
            width: `${canvasWidth * scale}px`,
            height: `${canvasHeight * scale}px`,
            minWidth: `${canvasWidth * scale}px`,
            minHeight: `${canvasHeight * scale}px`,
          }}
        >
          {renderedObjects}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Preview with {sampleRecord ? 'first record data' : 'placeholder values'} • {canvasWidth}×{canvasHeight}px
      </p>
    </div>
  );
}
