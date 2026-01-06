import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Strikethrough,
  CaseLower, CaseUpper, Type
} from 'lucide-react';

const FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Nunito', 'Inter', 'DM Sans'
];

interface TextSettings {
  fontSize: number;
  fontFamily: string;
  fill: string;
  textCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface DesignerTextToolbarProps {
  selectedObject: any;
  canvas: any;
  onUpdate: () => void;
  customFonts?: string[];
  onTextSettingsChange?: (settings: Partial<TextSettings>) => void;
}

export function DesignerTextToolbar({ selectedObject, canvas, onUpdate, customFonts = [], onTextSettingsChange }: DesignerTextToolbarProps) {
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState<string | number>('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [underline, setUnderline] = useState(false);
  const [linethrough, setLinethrough] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [textColor, setTextColor] = useState('#000000');
  const [textCase, setTextCase] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  const isTextObject = selectedObject?.type === 'textbox' || selectedObject?.type === 'i-text';

  useEffect(() => {
    if (!selectedObject || !isTextObject) return;
    
    setFontSize(selectedObject.fontSize || 16);
    setFontFamily(selectedObject.fontFamily || 'Arial');
    setFontWeight(selectedObject.fontWeight || 'normal');
    setFontStyle(selectedObject.fontStyle || 'normal');
    setUnderline(selectedObject.underline || false);
    setLinethrough(selectedObject.linethrough || false);
    setTextAlign(selectedObject.textAlign || 'left');
    setTextColor(typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000');
    setTextCase(selectedObject.data?.textCase || 'none');
  }, [selectedObject, isTextObject]);

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject || !canvas) return;
    selectedObject.set(key, value);
    canvas.requestRenderAll();
    onUpdate();
    
    // Notify parent about text settings changes for persistence
    if (key === 'fontSize' && onTextSettingsChange) {
      onTextSettingsChange({ fontSize: value });
    } else if (key === 'fontFamily' && onTextSettingsChange) {
      onTextSettingsChange({ fontFamily: value });
    } else if (key === 'fill' && typeof value === 'string' && onTextSettingsChange) {
      onTextSettingsChange({ fill: value });
    }
  };

  const updateTextCase = (newCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize') => {
    if (!selectedObject || !canvas) return;
    
    setTextCase(newCase);
    
    // Store in data for PDF generation
    if (!selectedObject.data) selectedObject.data = {};
    selectedObject.data.textCase = newCase;
    
    canvas.requestRenderAll();
    onUpdate();
    
    // Notify parent about text case change
    if (onTextSettingsChange) {
      onTextSettingsChange({ textCase: newCase });
    }
  };

  if (!isTextObject) return null;

  const allFonts = [...FONTS, ...customFonts.filter(f => !FONTS.includes(f))];

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 border-b flex-wrap">
      {/* Font Family */}
      <Select
        value={fontFamily}
        onValueChange={(v) => {
          setFontFamily(v);
          updateProperty('fontFamily', v);
        }}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {customFonts.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted">Custom</div>
              {customFonts.map((font) => (
                <SelectItem key={`custom-${font}`} value={font} className="text-xs" style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted">Standard</div>
            </>
          )}
          {FONTS.map((font) => (
            <SelectItem key={font} value={font} className="text-xs" style={{ fontFamily: font }}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Input
        type="number"
        value={fontSize}
        onChange={(e) => {
          const val = parseInt(e.target.value) || 16;
          setFontSize(val);
          updateProperty('fontSize', val);
        }}
        className="h-7 w-14 text-xs text-center"
        min={8}
        max={200}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Text Color */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                updateProperty('fill', e.target.value);
              }}
              className="h-7 w-7 p-0.5 cursor-pointer"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Text Color</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Bold */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={fontWeight === 'bold' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
              setFontWeight(newWeight);
              updateProperty('fontWeight', newWeight);
            }}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Bold</TooltipContent>
      </Tooltip>

      {/* Italic */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={fontStyle === 'italic' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
              setFontStyle(newStyle);
              updateProperty('fontStyle', newStyle);
            }}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Italic</TooltipContent>
      </Tooltip>

      {/* Underline */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={underline ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const newVal = !underline;
              setUnderline(newVal);
              updateProperty('underline', newVal);
            }}
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Underline</TooltipContent>
      </Tooltip>

      {/* Strikethrough */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={linethrough ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const newVal = !linethrough;
              setLinethrough(newVal);
              updateProperty('linethrough', newVal);
            }}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Strikethrough</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Text Case Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textCase === 'uppercase' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => updateTextCase(textCase === 'uppercase' ? 'none' : 'uppercase')}
          >
            <CaseUpper className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">UPPERCASE</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textCase === 'lowercase' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => updateTextCase(textCase === 'lowercase' ? 'none' : 'lowercase')}
          >
            <CaseLower className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">lowercase</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textCase === 'capitalize' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => updateTextCase(textCase === 'capitalize' ? 'none' : 'capitalize')}
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Capitalize</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Text Align */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textAlign === 'left' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setTextAlign('left');
              updateProperty('textAlign', 'left');
            }}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Align Left</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textAlign === 'center' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setTextAlign('center');
              updateProperty('textAlign', 'center');
            }}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Align Center</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={textAlign === 'right' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setTextAlign('right');
              updateProperty('textAlign', 'right');
            }}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Align Right</TooltipContent>
      </Tooltip>
    </div>
  );
}
