import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, RotateCcw } from 'lucide-react';

export type GradientType = 'linear' | 'radial';

export interface GradientStop {
  color: string;
  offset: number;
}

export interface GradientConfig {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
}

interface DesignerGradientPickerProps {
  value: GradientConfig | null;
  onChange: (gradient: GradientConfig | null) => void;
  onApply: (gradient: GradientConfig) => void;
}

const PRESET_GRADIENTS: GradientConfig[] = [
  {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#667eea', offset: 0 },
      { color: '#764ba2', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#f093fb', offset: 0 },
      { color: '#f5576c', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#4facfe', offset: 0 },
      { color: '#00f2fe', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#43e97b', offset: 0 },
      { color: '#38f9d7', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#fa709a', offset: 0 },
      { color: '#fee140', offset: 100 },
    ],
  },
  {
    type: 'radial',
    angle: 0,
    stops: [
      { color: '#ffffff', offset: 0 },
      { color: '#6a11cb', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#ff0844', offset: 0 },
      { color: '#ffb199', offset: 100 },
    ],
  },
  {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#0c0c0c', offset: 0 },
      { color: '#3a3a3a', offset: 50 },
      { color: '#0c0c0c', offset: 100 },
    ],
  },
];

const DEFAULT_GRADIENT: GradientConfig = {
  type: 'linear',
  angle: 180,
  stops: [
    { color: '#ffffff', offset: 0 },
    { color: '#e0e0e0', offset: 100 },
  ],
};

export function DesignerGradientPicker({
  value,
  onChange,
  onApply,
}: DesignerGradientPickerProps) {
  const [gradient, setGradient] = useState<GradientConfig>(value || DEFAULT_GRADIENT);

  const updateGradient = (updates: Partial<GradientConfig>) => {
    const newGradient = { ...gradient, ...updates };
    setGradient(newGradient);
    onChange(newGradient);
  };

  const updateStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = [...gradient.stops];
    newStops[index] = { ...newStops[index], ...updates };
    updateGradient({ stops: newStops });
  };

  const addStop = () => {
    if (gradient.stops.length >= 5) return;
    const lastStop = gradient.stops[gradient.stops.length - 1];
    const newStop: GradientStop = {
      color: '#888888',
      offset: Math.min(lastStop.offset + 20, 100),
    };
    updateGradient({ stops: [...gradient.stops, newStop].sort((a, b) => a.offset - b.offset) });
  };

  const removeStop = (index: number) => {
    if (gradient.stops.length <= 2) return;
    const newStops = gradient.stops.filter((_, i) => i !== index);
    updateGradient({ stops: newStops });
  };

  const selectPreset = (preset: GradientConfig) => {
    setGradient(preset);
    onChange(preset);
  };

  const getCssGradient = (g: GradientConfig) => {
    const stopsStr = g.stops.map(s => `${s.color} ${s.offset}%`).join(', ');
    if (g.type === 'radial') {
      return `radial-gradient(circle, ${stopsStr})`;
    }
    return `linear-gradient(${g.angle}deg, ${stopsStr})`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preset Gradients</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_GRADIENTS.map((preset, idx) => (
            <button
              key={idx}
              className="w-10 h-10 rounded border-2 border-transparent hover:border-primary transition-all"
              style={{ background: getCssGradient(preset) }}
              onClick={() => selectPreset(preset)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Gradient Type</Label>
        <Select value={gradient.type} onValueChange={(v) => updateGradient({ type: v as GradientType })}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {gradient.type === 'linear' && (
        <div className="space-y-2">
          <Label className="text-xs">Angle: {gradient.angle}°</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[gradient.angle]}
              onValueChange={([v]) => updateGradient({ angle: v })}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => updateGradient({ angle: 0 })}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Color Stops</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={addStop}
            disabled={gradient.stops.length >= 5}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {gradient.stops.map((stop, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                type="color"
                value={stop.color}
                onChange={(e) => updateStop(idx, { color: e.target.value })}
                className="w-8 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="number"
                value={stop.offset}
                onChange={(e) => updateStop(idx, { offset: Number(e.target.value) })}
                min={0}
                max={100}
                className="w-16 h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeStop(idx)}
                disabled={gradient.stops.length <= 2}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs">Preview</Label>
        <div 
          className="h-16 rounded-lg border"
          style={{ background: getCssGradient(gradient) }}
        />
      </div>

      <Button className="w-full" onClick={() => onApply(gradient)}>
        Apply Gradient
      </Button>
    </div>
  );
}

// Helper to convert gradient config to Fabric.js gradient
export function gradientConfigToFabric(config: GradientConfig, width: number, height: number) {
  // Convert stops to Fabric.js format with proper keys
  const colorStops: Record<string, string> = {};
  config.stops.forEach(stop => {
    // Ensure offset is between 0 and 1
    const offset = Math.max(0, Math.min(1, stop.offset / 100));
    colorStops[offset.toString()] = stop.color;
  });

  if (config.type === 'radial') {
    return {
      type: 'radial' as const,
      coords: {
        x1: width / 2,
        y1: height / 2,
        x2: width / 2,
        y2: height / 2,
        r1: 0,
        r2: Math.max(width, height) / 2,
      },
      colorStops,
    };
  }

  // Calculate linear gradient coordinates based on angle
  const angleRad = ((config.angle - 90) * Math.PI) / 180; // Adjust angle for CSS compatibility
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Calculate start and end points based on angle
  const x1 = width / 2 - (cos * width) / 2;
  const y1 = height / 2 - (sin * height) / 2;
  const x2 = width / 2 + (cos * width) / 2;
  const y2 = height / 2 + (sin * height) / 2;

  return {
    type: 'linear' as const,
    coords: { x1, y1, x2, y2 },
    colorStops,
  };
}
