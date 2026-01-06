import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Upload, User, Barcode, QrCode, Square, Circle, Triangle, Hexagon, Star, Heart, Octagon, Pentagon } from 'lucide-react';

export type PhotoShape = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'hexagon' | 'star' | 'heart' | 'octagon' | 'pentagon' | 'custom';

export interface CustomShapeMask {
  name: string;
  url: string;
}

interface DesignerImagesPanelProps {
  onAddImage: (file: File) => void;
  onAddPlaceholder: (type: 'photo' | 'barcode' | 'qrcode', shape?: PhotoShape, customMaskUrl?: string) => void;
  onAddCustomShape?: (file: File) => void;
  onAddCustomFont?: (file: File, fontName: string) => void;
  onUseCustomShape?: (url: string, name: string) => void;
  onChangePhotoShape?: (shape: PhotoShape, customMaskUrl?: string) => void;
  customShapes?: CustomShapeMask[];
  libraryShapes?: CustomShapeMask[];
  customFonts?: string[];
  selectedObject?: any;
  onClose: () => void;
}

const PHOTO_SHAPES: { id: PhotoShape; name: string; icon: React.ReactNode }[] = [
  { id: 'rect', name: 'Rectangle', icon: <Square className="h-5 w-5" /> },
  { id: 'rounded-rect', name: 'Rounded', icon: <div className="h-5 w-5 border-2 border-current rounded-md" /> },
  { id: 'circle', name: 'Circle', icon: <Circle className="h-5 w-5" /> },
  { id: 'ellipse', name: 'Ellipse', icon: <div className="h-4 w-6 border-2 border-current rounded-full" /> },
  { id: 'hexagon', name: 'Hexagon', icon: <Hexagon className="h-5 w-5" /> },
  { id: 'star', name: 'Star', icon: <Star className="h-5 w-5" /> },
  { id: 'heart', name: 'Heart', icon: <Heart className="h-5 w-5" /> },
  { id: 'octagon', name: 'Octagon', icon: <Octagon className="h-5 w-5" /> },
  { id: 'pentagon', name: 'Pentagon', icon: <Pentagon className="h-5 w-5" /> },
  { id: 'custom', name: 'Custom', icon: <Upload className="h-5 w-5" /> },
];

export function DesignerImagesPanel({
  onAddImage,
  onAddPlaceholder,
  onAddCustomShape,
  onAddCustomFont,
  onUseCustomShape,
  onChangePhotoShape,
  customShapes = [],
  libraryShapes = [],
  customFonts = [],
  selectedObject,
  onClose,
}: DesignerImagesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shapeInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const customMaskInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoShape, setSelectedPhotoShape] = useState<PhotoShape>('rect');
  const [selectedCustomMask, setSelectedCustomMask] = useState<string | null>(null);
  const [fontName, setFontName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddImage(file);
      e.target.value = '';
    }
  };

  const handleShapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddCustomShape) {
      onAddCustomShape(file);
      e.target.value = '';
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddCustomFont && fontName.trim()) {
      onAddCustomFont(file, fontName.trim());
      e.target.value = '';
      setFontName('');
    }
  };

  const handleCustomMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddCustomShape) {
      onAddCustomShape(file);
      e.target.value = '';
    }
  };

  const handleShapeClick = (shapeId: PhotoShape) => {
    if (shapeId === 'custom') {
      customMaskInputRef.current?.click();
    } else {
      setSelectedPhotoShape(shapeId);
      setSelectedCustomMask(null);
      if (selectedObject?.data?.isPhoto && onChangePhotoShape) {
        onChangePhotoShape(shapeId);
      }
    }
  };

  const handleUseCustomMask = (maskUrl: string, maskName: string) => {
    setSelectedPhotoShape('custom');
    setSelectedCustomMask(maskUrl);
    if (selectedObject?.data?.isPhoto && onChangePhotoShape) {
      onChangePhotoShape('custom', maskUrl);
    }
  };

  // Combine custom shapes and library shapes for the photo mask options
  const allCustomMasks = [...customShapes, ...libraryShapes];

  return (
    <div className="w-72 bg-card border-r shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-base">Images & Media</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Upload Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Upload Image</h4>
            <Button
              variant="outline"
              className="w-full h-16 flex-col gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">Upload Image</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Separator />

          {/* Photo Placeholder with Shape Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Photo Placeholder</h4>
            <p className="text-xs text-muted-foreground">
              {selectedObject?.data?.isPhoto 
                ? 'Click a shape to change the selected placeholder' 
                : 'Select shape, then click to add'}
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_SHAPES.filter(s => s.id !== 'custom').map((shape) => (
                <Button
                  key={shape.id}
                  variant={selectedPhotoShape === shape.id && !selectedCustomMask ? "default" : "outline"}
                  className="h-14 flex-col gap-1 p-1"
                  onClick={() => handleShapeClick(shape.id)}
                >
                  {shape.icon}
                  <span className="text-[10px]">{shape.name}</span>
                </Button>
              ))}
            </div>

            {/* Custom Masks from Library Shapes for Photo Placeholder */}
            {allCustomMasks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Library Shapes (as masks)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {allCustomMasks.map((shape, index) => (
                    <Button
                      key={`${shape.url}-${index}`}
                      variant={selectedCustomMask === shape.url ? "default" : "outline"}
                      className="h-12 w-full p-1"
                      title={`Use ${shape.name} as mask`}
                      onClick={() => handleUseCustomMask(shape.url, shape.name)}
                    >
                      <img src={shape.url} alt={shape.name} className="w-full h-full object-contain" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <input
              ref={customMaskInputRef}
              type="file"
              accept=".svg,.png"
              className="hidden"
              onChange={handleCustomMaskUpload}
            />
            
            <Button
              variant="secondary"
              className="w-full h-10"
              onClick={() => onAddPlaceholder('photo', selectedPhotoShape, selectedCustomMask || undefined)}
            >
              <User className="h-4 w-4 mr-2" />
              Add Photo ({selectedCustomMask ? 'Custom' : PHOTO_SHAPES.find(s => s.id === selectedPhotoShape)?.name})
            </Button>
          </div>

          <Separator />

          {/* Other Placeholders */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Other Placeholders</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-10"
                onClick={() => onAddPlaceholder('barcode')}
              >
                <Barcode className="h-4 w-4 mr-2" />
                Barcode Placeholder
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-10"
                onClick={() => onAddPlaceholder('qrcode')}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code Placeholder
              </Button>
            </div>
          </div>

          <Separator />

          {/* Custom Shape Upload */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Custom Shapes</h4>
            <p className="text-xs text-muted-foreground">Upload SVG or PNG with transparency</p>
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => shapeInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Custom Shape
            </Button>
            <input
              ref={shapeInputRef}
              type="file"
              accept=".svg,.png"
              className="hidden"
              onChange={handleShapeUpload}
            />
            
            {customShapes.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {customShapes.map((shape, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-12 w-12 p-1"
                    title={`Click to add ${shape.name}`}
                    onClick={() => onUseCustomShape?.(shape.url, shape.name)}
                  >
                    <img src={shape.url} alt={shape.name} className="w-full h-full object-contain" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Custom Font Upload */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Custom Fonts</h4>
            <p className="text-xs text-muted-foreground">Upload TTF or OTF font files</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Font name (e.g., MyFont)"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                className="w-full h-9 px-3 text-sm border rounded-md bg-background"
              />
              <Button
                variant="outline"
                className="w-full h-10"
                disabled={!fontName.trim()}
                onClick={() => fontInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Font
              </Button>
            </div>
            <input
              ref={fontInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="hidden"
              onChange={handleFontUpload}
            />
            
            {customFonts.length > 0 && (
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-muted-foreground">Loaded Fonts:</Label>
                <div className="flex flex-wrap gap-1">
                  {customFonts.map((font) => (
                    <span
                      key={font}
                      className="text-xs bg-muted px-2 py-1 rounded"
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
