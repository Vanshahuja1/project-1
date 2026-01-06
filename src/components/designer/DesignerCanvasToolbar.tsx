import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Grid3X3,
  Maximize2
} from 'lucide-react';

interface DesignerCanvasToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  currentPage?: number;
  totalPages?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  onFitToScreen?: () => void;
}

export function DesignerCanvasToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  currentPage = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  isPreviewMode = false,
  onTogglePreviewMode,
  showGrid = true,
  onToggleGrid,
  onFitToScreen,
}: DesignerCanvasToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between h-10 px-3 bg-card/80 backdrop-blur-sm border-t">
        {/* Left - Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Layers</TooltipContent>
          </Tooltip>
        </div>

        {/* Center - Page navigation */}
        <div className="flex items-center gap-1">
          {onPrevPage && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          
          {onNextPage && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Right - Zoom + Preview */}
        <div className="flex items-center gap-1">
          {onToggleGrid && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showGrid ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={onToggleGrid}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
          )}

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onZoomReset}
                className="text-xs font-medium w-12 text-center py-1 rounded hover:bg-muted transition-colors"
              >
                {Math.round(zoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent>Reset Zoom</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          {onFitToScreen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={onFitToScreen}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Screen</TooltipContent>
            </Tooltip>
          )}

          {onTogglePreviewMode && (
            <>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button 
                variant={isPreviewMode ? 'default' : 'outline'} 
                size="sm" 
                className="h-7 text-xs"
                onClick={onTogglePreviewMode}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
