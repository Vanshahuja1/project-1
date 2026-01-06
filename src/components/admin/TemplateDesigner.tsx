import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, Textbox, FabricImage, Line } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Type, Image, Square, Circle as CircleIcon, Minus, QrCode, Barcode,
  Save, Trash2, RotateCcw, FlipHorizontal, Layers, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  ChevronUp, ChevronDown, Palette, Move, GripVertical, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react';
import { TemplatePreview } from '@/components/pdf/TemplatePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const VARIABLE_FIELDS = [
  { id: 'name', label: 'Student Name', placeholder: '{{name}}' },
  { id: 'photo', label: 'Photo', placeholder: '{{photo}}' },
  { id: 'class', label: 'Class', placeholder: '{{class}}' },
  { id: 'roll_no', label: 'Roll No', placeholder: '{{roll_no}}' },
  { id: 'blood_group', label: 'Blood Group', placeholder: '{{blood_group}}' },
  { id: 'dob', label: 'Date of Birth', placeholder: '{{dob}}' },
  { id: 'address', label: 'Address', placeholder: '{{address}}' },
  { id: 'parent_name', label: 'Parent Name', placeholder: '{{parent_name}}' },
  { id: 'phone', label: 'Phone', placeholder: '{{phone}}' },
  { id: 'id_number', label: 'ID Number', placeholder: '{{id_number}}' },
  { id: 'barcode', label: 'Barcode', placeholder: '{{barcode}}' },
  { id: 'qr_code', label: 'QR Code', placeholder: '{{qr_code}}' },
];

const DEFAULT_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
  'Courier New', 'Impact', 'Trebuchet MS', 'Tahoma'
];

// Popular Google Fonts for ID cards and certificates
const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Poppins',
  'Raleway', 'Ubuntu', 'Nunito', 'Playfair Display', 'Merriweather',
  'Source Sans Pro', 'PT Sans', 'Noto Sans', 'Rubik', 'Work Sans',
  'Quicksand', 'Barlow', 'Mukta', 'Fira Sans', 'Inter', 'Lexend'
];

const ALL_FONTS = [...DEFAULT_FONTS, ...GOOGLE_FONTS];

interface TemplateDesignerProps {
  onSave?: () => void;
  editTemplate?: any;
}

export function TemplateDesigner({ onSave, editTemplate }: TemplateDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [backFabricCanvas, setBackFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [hasBackSide, setHasBackSide] = useState(false);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('ID Card');
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [isPublic, setIsPublic] = useState(false);

  // Text properties
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontColor, setFontColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);
  const [previewProjectId, setPreviewProjectId] = useState<string>('');
  const [previewRecordIndex, setPreviewRecordIndex] = useState(0);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch products for category
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, default_width_mm, default_height_mm')
        .eq('active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch projects for preview mode
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch records for selected project preview
  const { data: previewRecords = [] } = useQuery({
    queryKey: ['preview-records', previewProjectId],
    queryFn: async () => {
      if (!previewProjectId) return [];
      const { data, error } = await supabase
        .from('data_records')
        .select('*')
        .eq('project_id', previewProjectId)
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!previewProjectId,
  });

  const activeCanvas = activeSide === 'front' ? fabricCanvas : backFabricCanvas;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const mmToPixels = 3.78; // ~96 DPI / 25.4
    const canvas = new FabricCanvas(canvasRef.current, {
      width: widthMm * mmToPixels,
      height: heightMm * mmToPixels,
      backgroundColor: '#ffffff',
      selection: true,
    });

    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (!fabricCanvas) return;
    const mmToPixels = 3.78;
    fabricCanvas.setDimensions({
      width: widthMm * mmToPixels,
      height: heightMm * mmToPixels,
    });
    fabricCanvas.renderAll();
  }, [widthMm, heightMm, fabricCanvas]);

  // Initialize back canvas when enabled
  useEffect(() => {
    if (!hasBackSide || !backCanvasRef.current || backFabricCanvas) return;

    const mmToPixels = 3.78;
    const canvas = new FabricCanvas(backCanvasRef.current, {
      width: widthMm * mmToPixels,
      height: heightMm * mmToPixels,
      backgroundColor: '#ffffff',
      selection: true,
    });

    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));

    setBackFabricCanvas(canvas);

    return () => {
      canvas.dispose();
      setBackFabricCanvas(null);
    };
  }, [hasBackSide]);

  // Load template if editing
  useEffect(() => {
    if (editTemplate && fabricCanvas) {
      setTemplateName(editTemplate.name);
      setCategory(editTemplate.category);
      setWidthMm(editTemplate.width_mm);
      setHeightMm(editTemplate.height_mm);
      setIsPublic(editTemplate.is_public);
      setHasBackSide(editTemplate.has_back_side);

      if (editTemplate.design_json) {
        fabricCanvas.loadFromJSON(editTemplate.design_json, () => {
          fabricCanvas.renderAll();
        });
      }
    }
  }, [editTemplate, fabricCanvas]);

  const addText = useCallback((text: string, isVariable = false) => {
    if (!activeCanvas) return;
    
    const textbox = new Textbox(text, {
      left: 50,
      top: 50,
      fontSize,
      fontFamily,
      fill: fontColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline,
      editable: true,
      data: isVariable ? { type: 'variable', field: text.replace(/[{}]/g, '') } : undefined,
    });
    
    activeCanvas.add(textbox);
    activeCanvas.setActiveObject(textbox);
    activeCanvas.renderAll();
  }, [activeCanvas, fontSize, fontFamily, fontColor, isBold, isItalic, isUnderline]);

  const addShape = useCallback((type: 'rect' | 'circle' | 'line') => {
    if (!activeCanvas) return;

    let shape;
    switch (type) {
      case 'rect':
        shape = new Rect({
          left: 50,
          top: 50,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'circle':
        shape = new Circle({
          left: 50,
          top: 50,
          radius: 40,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'line':
        shape = new Line([50, 50, 150, 50], {
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
    }

    if (shape) {
      activeCanvas.add(shape);
      activeCanvas.setActiveObject(shape);
      activeCanvas.requestRenderAll();
    }
  }, [activeCanvas]);

  const addPhotoPlaceholder = useCallback(() => {
    if (!activeCanvas) return;

    const rect = new Rect({
      left: 50,
      top: 50,
      width: 80,
      height: 100,
      fill: '#e5e7eb',
      stroke: '#9ca3af',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      data: { type: 'variable', field: 'photo', isPhoto: true },
    });

    const text = new Textbox('{{photo}}', {
      left: 60,
      top: 90,
      fontSize: 12,
      fill: '#6b7280',
      editable: false,
      selectable: false,
    });

    activeCanvas.add(rect);
    activeCanvas.add(text);
    activeCanvas.setActiveObject(rect);
    activeCanvas.renderAll();
  }, [activeCanvas]);

  const addBarcodePlaceholder = useCallback(() => {
    if (!activeCanvas) return;

    const rect = new Rect({
      left: 50,
      top: 50,
      width: 120,
      height: 40,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
      data: { type: 'variable', field: 'barcode', isBarcode: true },
    });

    // Add barcode-like lines
    for (let i = 0; i < 20; i++) {
      const line = new Line([56 + i * 5, 55, 56 + i * 5, 85], {
        stroke: '#000000',
        strokeWidth: i % 3 === 0 ? 2 : 1,
        selectable: false,
      });
      activeCanvas.add(line);
    }

    activeCanvas.add(rect);
    activeCanvas.setActiveObject(rect);
    activeCanvas.renderAll();
  }, [activeCanvas]);

  const addQRPlaceholder = useCallback(() => {
    if (!activeCanvas) return;

    const rect = new Rect({
      left: 50,
      top: 50,
      width: 60,
      height: 60,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
      data: { type: 'variable', field: 'qr_code', isQR: true },
    });

    const text = new Textbox('QR', {
      left: 68,
      top: 70,
      fontSize: 14,
      fill: '#6b7280',
      editable: false,
      selectable: false,
    });

    activeCanvas.add(rect);
    activeCanvas.add(text);
    activeCanvas.setActiveObject(rect);
    activeCanvas.renderAll();
  }, [activeCanvas]);

  const deleteSelected = useCallback(() => {
    if (!activeCanvas) return;
    const activeObjects = activeCanvas.getActiveObjects();
    activeObjects.forEach((obj) => activeCanvas.remove(obj));
    activeCanvas.discardActiveObject();
    activeCanvas.renderAll();
  }, [activeCanvas]);

  const bringForward = useCallback(() => {
    if (!activeCanvas || !selectedObject) return;
    activeCanvas.bringObjectForward(selectedObject);
    activeCanvas.renderAll();
  }, [activeCanvas, selectedObject]);

  const sendBackward = useCallback(() => {
    if (!activeCanvas || !selectedObject) return;
    activeCanvas.sendObjectBackwards(selectedObject);
    activeCanvas.renderAll();
  }, [activeCanvas, selectedObject]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!activeCanvas) return;
    const newZoom = direction === 'in' ? Math.min(zoom * 1.2, 3) : Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
    activeCanvas.setZoom(newZoom);
    activeCanvas.renderAll();
  }, [activeCanvas, zoom]);

  // Update selected object properties
  useEffect(() => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;
    
    selectedObject.set({
      fontSize,
      fontFamily,
      fill: fontColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline,
    });
    activeCanvas?.renderAll();
  }, [fontSize, fontFamily, fontColor, isBold, isItalic, isUnderline, selectedObject, activeCanvas]);

  // Load selected object properties
  useEffect(() => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;
    
    setFontSize(selectedObject.fontSize || 16);
    setFontFamily(selectedObject.fontFamily || 'Arial');
    setFontColor(selectedObject.fill?.toString() || '#000000');
    setIsBold(selectedObject.fontWeight === 'bold');
    setIsItalic(selectedObject.fontStyle === 'italic');
    setIsUnderline(!!selectedObject.underline);
  }, [selectedObject]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fabricCanvas || !templateName) {
        throw new Error('Please enter a template name');
      }

      const designJson = fabricCanvas.toObject();
      const backDesignJson = hasBackSide && backFabricCanvas 
        ? backFabricCanvas.toObject() 
        : null;

      const templateData = {
        name: templateName,
        category,
        width_mm: widthMm,
        height_mm: heightMm,
        is_public: isPublic,
        has_back_side: hasBackSide,
        design_json: designJson,
        back_design_json: backDesignJson,
        vendor_id: null, // Super admin templates have no vendor
      };

      if (editTemplate?.id) {
        const { error } = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', editTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('templates')
          .insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Template saved successfully');
      queryClient.invalidateQueries({ queryKey: ['templates-management'] });
      onSave?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        img.scaleToWidth(100);
        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  }, [activeCanvas]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
      {/* Left Sidebar - Tools */}
      <Card className="w-full lg:w-64 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Design Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Elements */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Add Elements</Label>
            <div className="grid grid-cols-4 gap-1">
              <Button variant="outline" size="sm" onClick={() => addText('Text')} title="Add Text">
                <Type className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => addShape('rect')} title="Rectangle">
                <Square className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => addShape('circle')} title="Circle">
                <CircleIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => addShape('line')} title="Line">
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Variable Fields */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Variable Fields</Label>
            <div className="flex flex-wrap gap-1">
              {VARIABLE_FIELDS.slice(0, 4).map((field) => (
                <Badge 
                  key={field.id}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => addText(field.placeholder, true)}
                >
                  {field.label}
                </Badge>
              ))}
            </div>
            <Select onValueChange={(v) => {
              const field = VARIABLE_FIELDS.find(f => f.id === v);
              if (field) addText(field.placeholder, true);
            }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="More fields..." />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_FIELDS.slice(4).map((field) => (
                  <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Elements */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Special Elements</Label>
            <div className="grid grid-cols-3 gap-1">
              <Button variant="outline" size="sm" onClick={addPhotoPlaceholder} title="Photo">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={addBarcodePlaceholder} title="Barcode">
                <Barcode className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={addQRPlaceholder} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => handleZoom('in')} className="flex-1">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleZoom('out')} className="flex-1">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="flex-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={bringForward} className="flex-1" title="Bring Forward">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={sendBackward} className="flex-1" title="Send Backward">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col items-center">
        <div className="mb-4 flex items-center gap-4">
          {hasBackSide && (
            <Tabs value={activeSide} onValueChange={(v) => setActiveSide(v as 'front' | 'back')}>
              <TabsList>
                <TabsTrigger value="front">Front Side</TabsTrigger>
                <TabsTrigger value="back">Back Side</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Badge variant="outline">{Math.round(zoom * 100)}%</Badge>
          
          {/* Preview Mode Button */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview with Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview with Actual Student Data
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Project Selection */}
                <div className="space-y-2">
                  <Label>Select a Project</Label>
                  <Select value={previewProjectId} onValueChange={(v) => { setPreviewProjectId(v); setPreviewRecordIndex(0); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project to preview data from..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Record Navigation */}
                {previewRecords.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewRecordIndex === 0}
                      onClick={() => setPreviewRecordIndex(prev => Math.max(0, prev - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Record {previewRecordIndex + 1} of {previewRecords.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewRecordIndex >= previewRecords.length - 1}
                      onClick={() => setPreviewRecordIndex(prev => Math.min(previewRecords.length - 1, prev + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Template Preview */}
                {fabricCanvas && (
                  <TemplatePreview
                    templateData={{
                      design_json: fabricCanvas.toObject(),
                      back_design_json: hasBackSide && backFabricCanvas ? backFabricCanvas.toObject() : null,
                      has_back_side: hasBackSide,
                      width_mm: widthMm,
                      height_mm: heightMm,
                      canvas_width: fabricCanvas.getWidth(),
                      canvas_height: fabricCanvas.getHeight(),
                    }}
                    sampleRecord={previewRecords[previewRecordIndex]}
                    projectId={previewProjectId}
                    scale={1.2}
                  />
                )}

                {!previewProjectId && (
                  <div className="text-center text-muted-foreground py-8">
                    Select a project to see how your template looks with actual data
                  </div>
                )}

                {previewProjectId && previewRecords.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No records found in this project
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/20">
          <div style={{ display: activeSide === 'front' ? 'block' : 'none' }}>
            <canvas ref={canvasRef} className="shadow-lg rounded" />
          </div>
          {hasBackSide && (
            <div style={{ display: activeSide === 'back' ? 'block' : 'none' }}>
              <canvas ref={backCanvasRef} className="shadow-lg rounded" />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {widthMm} × {heightMm} mm
        </p>
      </div>

      {/* Right Sidebar - Properties */}
      <Card className="w-full lg:w-72 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Template Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Template Name *</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., School ID Card"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ID Card">ID Card</SelectItem>
                <SelectItem value="Certificate">Certificate</SelectItem>
                <SelectItem value="Badge">Badge</SelectItem>
                <SelectItem value="Visiting Card">Visiting Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width (mm)</Label>
              <Input
                type="number"
                value={widthMm}
                onChange={(e) => setWidthMm(parseFloat(e.target.value) || 85.6)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height (mm)</Label>
              <Input
                type="number"
                value={heightMm}
                onChange={(e) => setHeightMm(parseFloat(e.target.value) || 53.98)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Back Side</Label>
            <Switch checked={hasBackSide} onCheckedChange={setHasBackSide} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Make Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Text Properties */}
          {selectedObject?.type === 'textbox' && (
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs text-muted-foreground">Text Properties</Label>
              
              <div className="space-y-1">
                <Label className="text-xs">Font</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="system" disabled className="text-xs text-muted-foreground">
                      — System Fonts —
                    </SelectItem>
                    {DEFAULT_FONTS.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                    <SelectItem value="google" disabled className="text-xs text-muted-foreground border-t mt-1 pt-1">
                      — Google Fonts —
                    </SelectItem>
                    {GOOGLE_FONTS.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Size: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  min={8}
                  max={72}
                  step={1}
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-10 h-8 p-1"
                />
                <div className="flex gap-1">
                  <Button
                    variant={isBold ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsBold(!isBold)}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isItalic ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsItalic(!isItalic)}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isUnderline ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsUnderline(!isUnderline)}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !templateName}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
