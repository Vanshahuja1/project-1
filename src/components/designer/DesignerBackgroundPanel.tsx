import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Upload, Palette } from 'lucide-react';
import { DesignerGradientPicker, GradientConfig, gradientConfigToFabric } from './DesignerGradientPicker';

interface DesignerBackgroundPanelProps {
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  onBackgroundGradientChange?: (gradient: any) => void;
  onRemoveBackgroundGradient?: () => void;
  onBackgroundImageChange: (file: File) => void;
  onRemoveBackgroundImage: () => void;
  hasBackgroundImage: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db',
  '#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe',
  '#f3e8ff', '#fce7f3', '#000000', '#1f2937',
];

export function DesignerBackgroundPanel({
  backgroundColor,
  onBackgroundColorChange,
  onBackgroundGradientChange,
  onRemoveBackgroundGradient,
  onBackgroundImageChange,
  onRemoveBackgroundImage,
  hasBackgroundImage,
  onClose,
}: DesignerBackgroundPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gradientConfig, setGradientConfig] = useState<GradientConfig | null>(null);
  const [useGradient, setUseGradient] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onBackgroundImageChange(file);
      e.target.value = '';
    }
  };

  return (
    <div className="w-72 bg-card border-r shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-base">Background</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Color Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Color</h4>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  backgroundColor === color && !useGradient ? 'border-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setUseGradient(false);
                  onBackgroundColorChange(color);
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Custom:</Label>
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => {
                setUseGradient(false);
                onBackgroundColorChange(e.target.value);
              }}
              className="w-12 h-8 p-0.5 cursor-pointer"
            />
            <Input
              type="text"
              value={backgroundColor}
              onChange={(e) => {
                setUseGradient(false);
                onBackgroundColorChange(e.target.value);
              }}
              className="flex-1 h-8 text-xs"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* Gradient Section */}
        {onBackgroundGradientChange && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Gradient</h4>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Palette className="h-4 w-4" />
                  {useGradient ? 'Edit Gradient' : 'Add Gradient'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="right">
                <DesignerGradientPicker
                  value={gradientConfig}
                  onChange={setGradientConfig}
                  onApply={(config) => {
                    setGradientConfig(config);
                    setUseGradient(true);
                    onBackgroundGradientChange(config);
                  }}
                />
              </PopoverContent>
            </Popover>
            {useGradient && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setUseGradient(false);
                  setGradientConfig(null);
                  if (onRemoveBackgroundGradient) {
                    onRemoveBackgroundGradient();
                  }
                  onBackgroundColorChange('#ffffff');
                }}
              >
                Remove Gradient
              </Button>
            )}
          </div>
        )}

        {/* Image Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Image</h4>
          <Button
            variant="outline"
            className="w-full h-20 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Upload Background Image</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {hasBackgroundImage && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onRemoveBackgroundImage}
            >
              Remove Background Image
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
