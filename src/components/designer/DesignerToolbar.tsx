import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MousePointer2, Type, Square, Circle, Triangle, Star, Minus, 
  Image, QrCode, Barcode, Undo2, Redo2, ZoomIn, ZoomOut, 
  Grid3X3, Save, Download, Trash2, Copy, Clipboard, Lock, Unlock,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, 
  AlignCenterVertical, AlignEndVertical, FlipHorizontal, FlipVertical,
  RotateCcw, Layers, Eye, EyeOff, Hexagon, Pentagon, ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

export type ToolType = 'select' | 'pan' | 'text' | 'rect' | 'circle' | 'triangle' | 'star' | 'polygon' | 'line' | 'arrow' | 'image';

interface DesignerToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onSave: () => void;
  onExport: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  hasSelection: boolean;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
}

export function DesignerToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showGrid,
  onToggleGrid,
  onSave,
  onExport,
  onDelete,
  onCopy,
  onPaste,
  hasSelection,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onFlipH,
  onFlipV,
  onBringForward,
  onSendBackward,
  isPreviewMode,
  onTogglePreviewMode,
}: DesignerToolbarProps) {
  const ToolButton = ({ tool, icon: Icon, label }: { tool: ToolType; icon: any; label: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={activeTool === tool ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onToolChange(tool)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  const ActionButton = ({ icon: Icon, label, onClick, disabled = false }: { icon: any; label: string; onClick: () => void; disabled?: boolean }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-card">
      {/* Tools */}
      <div className="flex items-center gap-0.5">
        <ToolButton tool="select" icon={MousePointer2} label="Select (V)" />
        <ToolButton tool="text" icon={Type} label="Text (T)" />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Shapes */}
      <div className="flex items-center gap-0.5">
        <ToolButton tool="rect" icon={Square} label="Rectangle (R)" />
        <ToolButton tool="circle" icon={Circle} label="Circle (C)" />
        <ToolButton tool="triangle" icon={Triangle} label="Triangle" />
        <ToolButton tool="star" icon={Star} label="Star" />
        <ToolButton tool="polygon" icon={Hexagon} label="Polygon" />
        <ToolButton tool="line" icon={Minus} label="Line (L)" />
        <ToolButton tool="arrow" icon={ArrowRight} label="Arrow" />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Media */}
      <div className="flex items-center gap-0.5">
        <ToolButton tool="image" icon={Image} label="Image" />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* History */}
      <div className="flex items-center gap-0.5">
        <ActionButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
        <ActionButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Clipboard */}
      <div className="flex items-center gap-0.5">
        <ActionButton icon={Copy} label="Copy (Ctrl+C)" onClick={onCopy} disabled={!hasSelection} />
        <ActionButton icon={Clipboard} label="Paste (Ctrl+V)" onClick={onPaste} />
        <ActionButton icon={Trash2} label="Delete (Del)" onClick={onDelete} disabled={!hasSelection} />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection}>
            <AlignLeft className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onAlignLeft}>
            <AlignLeft className="h-4 w-4 mr-2" /> Align Left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAlignCenter}>
            <AlignCenter className="h-4 w-4 mr-2" /> Align Center
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAlignRight}>
            <AlignRight className="h-4 w-4 mr-2" /> Align Right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAlignTop}>
            <AlignStartVertical className="h-4 w-4 mr-2" /> Align Top
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAlignMiddle}>
            <AlignCenterVertical className="h-4 w-4 mr-2" /> Align Middle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAlignBottom}>
            <AlignEndVertical className="h-4 w-4 mr-2" /> Align Bottom
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transform */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSelection}>
            <FlipHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onFlipH}>
            <FlipHorizontal className="h-4 w-4 mr-2" /> Flip Horizontal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onFlipV}>
            <FlipVertical className="h-4 w-4 mr-2" /> Flip Vertical
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onBringForward}>
            <Layers className="h-4 w-4 mr-2" /> Bring Forward
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSendBackward}>
            <Layers className="h-4 w-4 mr-2 rotate-180" /> Send Backward
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <KeyboardShortcutsPanel />
        <ActionButton 
          icon={Grid3X3} 
          label="Toggle Grid" 
          onClick={onToggleGrid}
        />
        <ActionButton icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={onZoomReset}
              className="text-xs font-medium w-14 text-center py-1 px-2 rounded hover:bg-muted transition-colors cursor-pointer"
            >
              {Math.round(zoom * 100)}%
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Click to reset to 100%</TooltipContent>
        </Tooltip>
        <ActionButton icon={ZoomIn} label="Zoom In" onClick={onZoomIn} />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Preview Mode */}
      {onTogglePreviewMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPreviewMode ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={onTogglePreviewMode}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preview with sample data</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Save/Export */}
      <div className="flex items-center gap-0.5">
        <ActionButton icon={Download} label="Export as PNG" onClick={onExport} />
        <Button size="sm" onClick={onSave} className="h-8">
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
