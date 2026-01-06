interface CanvasOverlaysProps {
  widthPx: number;
  heightPx: number;
  bleedMm: number;
  safeZoneMm: number;
  mmToPixels: number;
  zoom: number;
  showBleed?: boolean;
  showSafeZone?: boolean;
  showLabels?: boolean;
}

export function CanvasOverlays({
  widthPx,
  heightPx,
  bleedMm,
  safeZoneMm,
  mmToPixels,
  zoom,
  showBleed = true,
  showSafeZone = true,
  showLabels = true,
}: CanvasOverlaysProps) {
  const bleedPx = bleedMm * mmToPixels * zoom;
  const safeZonePx = safeZoneMm * mmToPixels * zoom;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ width: widthPx * zoom, height: heightPx * zoom }}
    >
      {/* Bleed Line */}
      {showBleed && bleedMm > 0 && (
        <>
          <div 
            className="absolute border border-dashed border-red-400/70"
            style={{
              top: -bleedPx,
              left: -bleedPx,
              right: -bleedPx,
              bottom: -bleedPx,
            }}
          />
          {showLabels && (
            <span 
              className="absolute text-[9px] font-medium text-red-400 bg-background/80 px-1 rounded"
              style={{ top: -bleedPx - 14, left: 0 }}
            >
              BLEED LINE
            </span>
          )}
        </>
      )}

      {/* Safe Zone */}
      {showSafeZone && safeZoneMm > 0 && (
        <>
          <div 
            className="absolute border border-dashed border-blue-400/70"
            style={{
              top: safeZonePx,
              left: safeZonePx,
              right: safeZonePx,
              bottom: safeZonePx,
            }}
          />
          {showLabels && (
            <span 
              className="absolute text-[9px] font-medium text-blue-400 bg-background/80 px-1 rounded"
              style={{ top: safeZonePx - 14, left: safeZonePx }}
            >
              SAFE ZONE
            </span>
          )}
        </>
      )}

      {/* Corner guides */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-muted-foreground/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-muted-foreground/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-muted-foreground/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-muted-foreground/30" />
    </div>
  );
}
