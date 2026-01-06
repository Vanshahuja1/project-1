import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CreditCard, FileText, BadgeCheck, Square } from 'lucide-react';

const PRESET_SIZES = [
  { name: 'ID Card', width: 85.6, height: 53.98, icon: CreditCard },
  { name: 'A4', width: 210, height: 297, icon: FileText },
  { name: 'Business Card', width: 85, height: 55, icon: CreditCard },
  { name: 'Badge', width: 75, height: 75, icon: BadgeCheck },
];

interface DesignerLayoutPanelProps {
  widthMm: number;
  heightMm: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  onMarginTopChange: (value: number) => void;
  onMarginLeftChange: (value: number) => void;
  onMarginRightChange: (value: number) => void;
  onMarginBottomChange: (value: number) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (value: boolean) => void;
  gridSize: number;
  onGridSizeChange: (value: number) => void;
  onClose: () => void;
}

export function DesignerLayoutPanel({
  widthMm,
  heightMm,
  onWidthChange,
  onHeightChange,
  marginTop,
  marginLeft,
  marginRight,
  marginBottom,
  onMarginTopChange,
  onMarginLeftChange,
  onMarginRightChange,
  onMarginBottomChange,
  category,
  onCategoryChange,
  snapToGrid,
  onSnapToGridChange,
  gridSize,
  onGridSizeChange,
  onClose,
}: DesignerLayoutPanelProps) {
  const handlePresetClick = (preset: typeof PRESET_SIZES[0]) => {
    onWidthChange(preset.width);
    onHeightChange(preset.height);
  };

  return (
    <div className="w-64 bg-card border-r shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <h3 className="font-semibold text-sm">Layout</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Preset Sizes */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Preset Sizes</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_SIZES.map((preset) => {
                const Icon = preset.icon;
                const isActive = widthMm === preset.width && heightMm === preset.height;
                return (
                  <Button
                    key={preset.name}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-1.5 px-2 flex flex-col items-center gap-0.5"
                    onClick={() => handlePresetClick(preset)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px]">{preset.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Size Section */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Custom Size</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Width (mm)</Label>
                <Input
                  type="number"
                  value={widthMm}
                  onChange={(e) => onWidthChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Height (mm)</Label>
                <Input
                  type="number"
                  value={heightMm}
                  onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Snap to Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-xs">Snap to Grid</h4>
              <Switch checked={snapToGrid} onCheckedChange={onSnapToGridChange} className="scale-90" />
            </div>
            {snapToGrid && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Grid Size (px)</Label>
                <Input
                  type="number"
                  value={gridSize}
                  onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 10)}
                  min={5}
                  max={50}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </div>

          {/* Margin Section */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Margin (mm)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Top</Label>
                <Input
                  type="number"
                  value={marginTop}
                  onChange={(e) => onMarginTopChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Left</Label>
                <Input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => onMarginLeftChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Right</Label>
                <Input
                  type="number"
                  value={marginRight}
                  onChange={(e) => onMarginRightChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                <Input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => onMarginBottomChange(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Template Type Section */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs">Template type</h4>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ID Card" className="text-xs">Id card</SelectItem>
                <SelectItem value="Certificate" className="text-xs">Certificate</SelectItem>
                <SelectItem value="Badge" className="text-xs">Badge</SelectItem>
                <SelectItem value="Visiting Card" className="text-xs">Visiting Card</SelectItem>
                <SelectItem value="Other" className="text-xs">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
