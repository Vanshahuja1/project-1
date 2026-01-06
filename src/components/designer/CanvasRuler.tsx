import { useEffect, useRef } from 'react';

interface CanvasRulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  zoom: number;
  offset?: number;
}

export function CanvasRuler({ orientation, length, zoom, offset = 0 }: CanvasRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mmToPixels = 3.78;
  const rulerHeight = 24;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get computed CSS colors
    const computedStyle = getComputedStyle(document.documentElement);
    const cardColor = computedStyle.getPropertyValue('--card').trim();
    const mutedForeground = computedStyle.getPropertyValue('--muted-foreground').trim();
    const borderColor = computedStyle.getPropertyValue('--border').trim();
    const mutedColor = computedStyle.getPropertyValue('--muted').trim();
    const primaryColor = computedStyle.getPropertyValue('--primary').trim();

    const isHorizontal = orientation === 'horizontal';
    const scaledLength = length * mmToPixels * zoom;
    
    // Set canvas dimensions with padding for corner
    if (isHorizontal) {
      canvas.width = scaledLength + rulerHeight;
      canvas.height = rulerHeight;
    } else {
      canvas.width = rulerHeight;
      canvas.height = scaledLength;
    }

    // Clear canvas with card background
    ctx.fillStyle = cardColor ? `hsl(${cardColor})` : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ruler markings
    const textColor = mutedForeground ? `hsl(${mutedForeground})` : '#6b7280';
    const tickColor = mutedForeground ? `hsl(${mutedForeground})` : '#9ca3af';
    ctx.fillStyle = textColor;
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate tick spacing based on zoom
    const baseTickSpacing = mmToPixels * zoom;
    
    // Determine appropriate scale based on zoom level
    let majorTickEvery = 10; // Every 10mm by default
    let mediumTickEvery = 5; // Every 5mm
    let minorTickEvery = 1; // Every 1mm
    
    // Adjust tick frequency based on zoom
    if (zoom < 0.5) {
      majorTickEvery = 20;
      mediumTickEvery = 10;
      minorTickEvery = 5;
    } else if (zoom > 2) {
      majorTickEvery = 5;
      mediumTickEvery = 1;
      minorTickEvery = 0.5;
    }

    const startOffset = isHorizontal ? rulerHeight : 0;

    // Draw mm markings
    for (let i = 0; i <= length; i += minorTickEvery) {
      const pos = startOffset + i * baseTickSpacing;
      const isMajor = i % majorTickEvery === 0;
      const isMedium = i % mediumTickEvery === 0 && !isMajor;

      let tickLength = 4;
      if (isMedium) tickLength = 8;
      if (isMajor) tickLength = 14;

      ctx.beginPath();
      ctx.strokeStyle = isMajor ? textColor : tickColor;
      ctx.lineWidth = isMajor ? 1 : 0.5;
      
      if (isHorizontal) {
        ctx.moveTo(pos, rulerHeight);
        ctx.lineTo(pos, rulerHeight - tickLength);
        
        if (isMajor && i > 0) {
          ctx.fillStyle = textColor;
          ctx.fillText(i.toString(), pos, 8);
        }
      } else {
        ctx.moveTo(rulerHeight, pos);
        ctx.lineTo(rulerHeight - tickLength, pos);
        
        if (isMajor && i > 0) {
          ctx.save();
          ctx.translate(8, pos);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = textColor;
          ctx.fillText(i.toString(), 0, 0);
          ctx.restore();
        }
      }
      ctx.stroke();
    }

    // Draw edge border
    ctx.strokeStyle = borderColor ? `hsl(${borderColor})` : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(rulerHeight, rulerHeight - 0.5);
      ctx.lineTo(canvas.width, rulerHeight - 0.5);
    } else {
      ctx.moveTo(rulerHeight - 0.5, 0);
      ctx.lineTo(rulerHeight - 0.5, canvas.height);
    }
    ctx.stroke();

    // Draw corner square for horizontal ruler only
    if (isHorizontal) {
      ctx.fillStyle = mutedColor ? `hsl(${mutedColor})` : '#f3f4f6';
      ctx.fillRect(0, 0, rulerHeight, rulerHeight);
      
      // Draw corner border
      ctx.strokeStyle = borderColor ? `hsl(${borderColor})` : '#e5e7eb';
      ctx.strokeRect(0, 0, rulerHeight, rulerHeight);
    }

  }, [orientation, length, zoom]);

  const isHorizontal = orientation === 'horizontal';
  const scaledLength = length * mmToPixels * zoom;

  return (
    <canvas
      ref={canvasRef}
      className="flex-shrink-0"
      style={{
        display: 'block',
        width: isHorizontal ? scaledLength + 24 : 24,
        height: isHorizontal ? 24 : scaledLength,
      }}
    />
  );
}
