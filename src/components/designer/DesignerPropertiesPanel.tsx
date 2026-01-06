import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DesignerGradientPicker, GradientConfig, gradientConfigToFabric } from './DesignerGradientPicker';
import { Gradient } from 'fabric';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Strikethrough, ChevronDown, Palette, CaseSensitive, WrapText, Scaling
} from 'lucide-react';

const GOOGLE_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
  'Courier New', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Tahoma',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
  'Poppins', 'Source Sans Pro', 'Ubuntu', 'Merriweather', 'Playfair Display',
  'Nunito', 'PT Sans', 'Rubik', 'Work Sans', 'Quicksand', 'Fira Sans',
  'Barlow', 'Mulish', 'Karla', 'Manrope', 'Inter', 'DM Sans'
];

interface DesignerPropertiesPanelProps {
  selectedObject: any;
  canvas: any;
  onUpdate: () => void;
  customFonts?: string[];
}

export function DesignerPropertiesPanel({ selectedObject, canvas, onUpdate, customFonts = [] }: DesignerPropertiesPanelProps) {
  const [properties, setProperties] = useState({
    // Position & Size
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    // Appearance
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 0,
    opacity: 1,
    // Text
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    linethrough: false,
    textAlign: 'left',
    lineHeight: 1.2,
    charSpacing: 0,
    // Text background
    textBackgroundColor: '',
    hasTextBackground: false,
    // Shadow
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    // Border radius (for rect)
    rx: 0,
    ry: 0,
    // Gradient
    useGradient: false,
    // Curved text
    curveRadius: 0,
    // New text properties
    textCase: 'none' as 'none' | 'uppercase' | 'lowercase' | 'capitalize',
    autoFontSize: false,
    wordWrap: true,
  });

  const [gradientConfig, setGradientConfig] = useState<GradientConfig | null>(null);

  useEffect(() => {
    if (!selectedObject) return;

    const bgColor = selectedObject.backgroundColor || selectedObject.textBackgroundColor || '';

    setProperties({
      left: Math.round(selectedObject.left || 0),
      top: Math.round(selectedObject.top || 0),
      width: Math.round(selectedObject.width * (selectedObject.scaleX || 1)),
      height: Math.round(selectedObject.height * (selectedObject.scaleY || 1)),
      angle: Math.round(selectedObject.angle || 0),
      scaleX: selectedObject.scaleX || 1,
      scaleY: selectedObject.scaleY || 1,
      fill: selectedObject.fill || '#000000',
      stroke: selectedObject.stroke || '#000000',
      strokeWidth: selectedObject.strokeWidth || 0,
      opacity: selectedObject.opacity || 1,
      fontSize: selectedObject.fontSize || 16,
      fontFamily: selectedObject.fontFamily || 'Arial',
      fontWeight: selectedObject.fontWeight || 'normal',
      fontStyle: selectedObject.fontStyle || 'normal',
      underline: selectedObject.underline || false,
      linethrough: selectedObject.linethrough || false,
      textAlign: selectedObject.textAlign || 'left',
      lineHeight: selectedObject.lineHeight || 1.2,
      charSpacing: selectedObject.charSpacing || 0,
      textBackgroundColor: bgColor,
      hasTextBackground: !!bgColor,
      shadowEnabled: !!selectedObject.shadow,
      shadowColor: selectedObject.shadow?.color || '#000000',
      shadowBlur: selectedObject.shadow?.blur || 10,
      shadowOffsetX: selectedObject.shadow?.offsetX || 5,
      shadowOffsetY: selectedObject.shadow?.offsetY || 5,
      rx: selectedObject.rx || 0,
      ry: selectedObject.ry || 0,
      useGradient: typeof selectedObject.fill === 'object',
      curveRadius: selectedObject.data?.curveRadius || 0,
      textCase: selectedObject.data?.textCase || 'none',
      autoFontSize: selectedObject.data?.autoFontSize || false,
      wordWrap: selectedObject.splitByGrapheme !== false,
    });
  }, [selectedObject]);

  const isLocked = !!selectedObject?.lockMovementX;

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject || !canvas || isLocked) return;

    setProperties(prev => ({ ...prev, [key]: value }));

    // Handle special cases
    if (key === 'width') {
      selectedObject.set('scaleX', value / selectedObject.width);
    } else if (key === 'height') {
      selectedObject.set('scaleY', value / selectedObject.height);
    } else if (key === 'hasTextBackground') {
      if (value) {
        selectedObject.set('backgroundColor', properties.textBackgroundColor || '#ffffff');
      } else {
        selectedObject.set('backgroundColor', '');
      }
    } else if (key === 'textBackgroundColor') {
      if (properties.hasTextBackground) {
        selectedObject.set('backgroundColor', value);
      }
    } else if (key === 'textCase') {
      // Store in data for PDF generation
      if (!selectedObject.data) selectedObject.data = {};
      selectedObject.data.textCase = value;
    } else if (key === 'autoFontSize') {
      if (!selectedObject.data) selectedObject.data = {};
      selectedObject.data.autoFontSize = value;
    } else if (key === 'wordWrap') {
      selectedObject.set('splitByGrapheme', value);
      if (!selectedObject.data) selectedObject.data = {};
      selectedObject.data.wordWrap = value;
    } else if (key === 'shadowEnabled') {
      if (value) {
        selectedObject.set('shadow', {
          color: properties.shadowColor,
          blur: properties.shadowBlur,
          offsetX: properties.shadowOffsetX,
          offsetY: properties.shadowOffsetY,
        });
      } else {
        selectedObject.set('shadow', null);
      }
    } else if (key.startsWith('shadow') && key !== 'shadowEnabled') {
      if (properties.shadowEnabled) {
        selectedObject.set('shadow', {
          color: key === 'shadowColor' ? value : properties.shadowColor,
          blur: key === 'shadowBlur' ? value : properties.shadowBlur,
          offsetX: key === 'shadowOffsetX' ? value : properties.shadowOffsetX,
          offsetY: key === 'shadowOffsetY' ? value : properties.shadowOffsetY,
        });
      }
    } else {
      selectedObject.set(key, value);
    }

    canvas.requestRenderAll();
    onUpdate();
  };

  const isTextObject = selectedObject?.type === 'textbox' || selectedObject?.type === 'i-text';
  const isRect = selectedObject?.type === 'rect';

  // Combine default fonts with custom fonts
  const allFonts = [...GOOGLE_FONTS, ...customFonts.filter(f => !GOOGLE_FONTS.includes(f))];

  if (!selectedObject) {
    return (
      <Card className="w-full h-auto border-0 border-b rounded-none shadow-none">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs">Properties</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground text-center py-4 px-3">
          Select an object to edit
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-auto border-0 border-b rounded-none shadow-none overflow-hidden">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs capitalize">{selectedObject.type}</CardTitle>
      </CardHeader>
      <ScrollArea className="max-h-[300px]">
        <CardContent className="space-y-3 pb-4 px-3">
          <Tabs defaultValue="position" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-7">
              <TabsTrigger value="position" className="text-[10px] h-6">Position</TabsTrigger>
              <TabsTrigger value="style" className="text-[10px] h-6">Style</TabsTrigger>
              {isTextObject && <TabsTrigger value="text" className="text-[10px] h-6">Text</TabsTrigger>}
            </TabsList>

            {/* Position Tab */}
            <TabsContent value="position" className="space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">X</Label>
                  <Input
                    type="number"
                    value={properties.left}
                    onChange={(e) => updateProperty('left', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Y</Label>
                  <Input
                    type="number"
                    value={properties.top}
                    onChange={(e) => updateProperty('top', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Width</Label>
                  <Input
                    type="number"
                    value={properties.width}
                    onChange={(e) => updateProperty('width', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Height</Label>
                  <Input
                    type="number"
                    value={properties.height}
                    onChange={(e) => updateProperty('height', parseFloat(e.target.value) || 0)}
                    className="h-6 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px]">Rotation: {properties.angle}°</Label>
                <Slider
                  value={[properties.angle]}
                  onValueChange={([v]) => updateProperty('angle', v)}
                  min={0}
                  max={360}
                  step={1}
                  className="py-1"
                />
              </div>

              {isRect && (
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Corner: {properties.rx}px</Label>
                  <Slider
                    value={[properties.rx]}
                    onValueChange={([v]) => {
                      updateProperty('rx', v);
                      updateProperty('ry', v);
                    }}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="style" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Fill Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={typeof properties.fill === 'string' ? properties.fill : '#000000'}
                    onChange={(e) => updateProperty('fill', e.target.value)}
                    className="w-10 h-8 p-1"
                    disabled={isLocked}
                  />
                  <Input
                    type="text"
                    value={typeof properties.fill === 'string' ? properties.fill : ''}
                    onChange={(e) => updateProperty('fill', e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="#000000"
                    disabled={isLocked}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8" title="Gradient">
                        <Palette className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" side="left">
                      <DesignerGradientPicker
                        value={gradientConfig}
                        onChange={setGradientConfig}
                        onApply={(config) => {
                          if (!selectedObject || !canvas) return;
                          try {
                            const width = selectedObject.width * (selectedObject.scaleX || 1);
                            const height = selectedObject.height * (selectedObject.scaleY || 1);
                            const fabricGradient = gradientConfigToFabric(config, width, height);

                            // Create gradient with proper colorStops format for Fabric.js v6
                            const colorStops = Object.entries(fabricGradient.colorStops).map(([offset, color]) => ({
                              offset: parseFloat(offset),
                              color: color as string,
                            }));

                            let gradient;
                            if (fabricGradient.type === 'radial') {
                              gradient = new Gradient<'radial'>({
                                type: 'radial',
                                coords: fabricGradient.coords as any,
                                colorStops,
                              });
                            } else {
                              gradient = new Gradient<'linear'>({
                                type: 'linear',
                                coords: fabricGradient.coords,
                                colorStops,
                              });
                            }

                            selectedObject.set('fill', gradient);
                            canvas.requestRenderAll();
                            onUpdate();
                            setProperties(prev => ({ ...prev, useGradient: true }));
                          } catch (error) {
                            console.error('Error applying gradient:', error);
                          }
                        }}
                      />
                      {properties.useGradient && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            updateProperty('fill', '#000000');
                            setProperties(prev => ({ ...prev, useGradient: false }));
                          }}
                        >
                          Remove Gradient
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Stroke Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={properties.stroke || '#000000'}
                    onChange={(e) => updateProperty('stroke', e.target.value)}
                    className="w-10 h-8 p-1"
                  />
                  <Input
                    type="text"
                    value={properties.stroke || ''}
                    onChange={(e) => updateProperty('stroke', e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Stroke Width: {properties.strokeWidth}px</Label>
                <Slider
                  value={[properties.strokeWidth]}
                  onValueChange={([v]) => updateProperty('strokeWidth', v)}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Opacity: {Math.round(properties.opacity * 100)}%</Label>
                <Slider
                  value={[properties.opacity * 100]}
                  onValueChange={([v]) => updateProperty('opacity', v / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <Separator className="my-3" />

              {/* Shadow */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Shadow</Label>
                  <Switch
                    checked={properties.shadowEnabled}
                    onCheckedChange={(v) => updateProperty('shadowEnabled', v)}
                  />
                </div>

                {properties.shadowEnabled && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={properties.shadowColor}
                        onChange={(e) => updateProperty('shadowColor', e.target.value)}
                        className="w-10 h-8 p-1"
                      />
                      <Input
                        type="text"
                        value={properties.shadowColor}
                        onChange={(e) => updateProperty('shadowColor', e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Blur: {properties.shadowBlur}px</Label>
                      <Slider
                        value={[properties.shadowBlur]}
                        onValueChange={([v]) => updateProperty('shadowBlur', v)}
                        min={0}
                        max={50}
                        step={1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Offset X</Label>
                        <Input
                          type="number"
                          value={properties.shadowOffsetX}
                          onChange={(e) => updateProperty('shadowOffsetX', parseFloat(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Offset Y</Label>
                        <Input
                          type="number"
                          value={properties.shadowOffsetY}
                          onChange={(e) => updateProperty('shadowOffsetY', parseFloat(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Text Tab */}
            {isTextObject && (
              <TabsContent value="text" className="space-y-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Font Family</Label>
                  <Select
                    value={properties.fontFamily}
                    onValueChange={(v) => updateProperty('fontFamily', v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {customFonts.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">Custom Fonts</div>
                          {customFonts.map((font) => (
                            <SelectItem key={`custom-${font}`} value={font} style={{ fontFamily: font }}>
                              {font}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">Standard Fonts</div>
                        </>
                      )}
                      {GOOGLE_FONTS.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Font Size: {properties.fontSize}px</Label>
                  <Slider
                    value={[properties.fontSize]}
                    onValueChange={([v]) => updateProperty('fontSize', v)}
                    min={8}
                    max={120}
                    step={1}
                  />
                </div>

                <div className="flex gap-1">
                  <Button
                    variant={properties.fontWeight === 'bold' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={properties.fontStyle === 'italic' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={properties.underline ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('underline', !properties.underline)}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={properties.linethrough ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('linethrough', !properties.linethrough)}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant={properties.textAlign === 'left' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('textAlign', 'left')}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={properties.textAlign === 'center' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('textAlign', 'center')}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={properties.textAlign === 'right' ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateProperty('textAlign', 'right')}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Line Height: {properties.lineHeight.toFixed(1)}</Label>
                  <Slider
                    value={[properties.lineHeight * 10]}
                    onValueChange={([v]) => updateProperty('lineHeight', v / 10)}
                    min={8}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Letter Spacing: {properties.charSpacing}</Label>
                  <Slider
                    value={[properties.charSpacing]}
                    onValueChange={([v]) => updateProperty('charSpacing', v)}
                    min={-100}
                    max={500}
                    step={10}
                  />
                </div>

                <Separator className="my-3" />

                {/* Text Case, Auto Font Size, Word Wrap */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <CaseSensitive className="h-3 w-3" /> Text Case
                    </Label>
                    <Select
                      value={properties.textCase}
                      onValueChange={(v: 'none' | 'uppercase' | 'lowercase' | 'capitalize') => updateProperty('textCase', v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <Scaling className="h-3 w-3" /> Auto Font Size
                    </Label>
                    <Switch
                      checked={properties.autoFontSize}
                      disabled={isLocked}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-2">
                    Automatically shrink text to fit width
                  </p>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <WrapText className="h-3 w-3" /> Word Wrap
                    </Label>
                    <Switch
                      checked={properties.wordWrap}
                      onCheckedChange={(v) => updateProperty('wordWrap', v)}
                    />
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Curved Text */}
                <div className="space-y-2">
                  <Label className="text-xs">Curve Radius: {properties.curveRadius}°</Label>
                  <Slider
                    value={[properties.curveRadius]}
                    onValueChange={([v]) => {
                      setProperties(prev => ({ ...prev, curveRadius: v }));
                      if (selectedObject) {
                        if (!selectedObject.data) selectedObject.data = {};
                        selectedObject.data.curveRadius = v;
                        // Apply curve effect using path text simulation
                        if (v !== 0) {
                          selectedObject.set('angle', v / 5);
                        } else {
                          selectedObject.set('angle', 0);
                        }
                        canvas?.requestRenderAll();
                        onUpdate();
                      }
                    }}
                    min={-180}
                    max={180}
                    step={5}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Positive = curve up, Negative = curve down
                  </p>
                </div>

                <Separator className="my-3" />

                {/* Text Background */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Background</Label>
                    <Switch
                      checked={properties.hasTextBackground}
                      onCheckedChange={(v) => updateProperty('hasTextBackground', v)}
                    />
                  </div>

                  {properties.hasTextBackground && (
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={properties.textBackgroundColor || '#ffffff'}
                        onChange={(e) => updateProperty('textBackgroundColor', e.target.value)}
                        className="w-10 h-8 p-1"
                      />
                      <Input
                        type="text"
                        value={properties.textBackgroundColor || '#ffffff'}
                        onChange={(e) => updateProperty('textBackgroundColor', e.target.value)}
                        className="h-8 text-sm flex-1"
                        placeholder="transparent"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
