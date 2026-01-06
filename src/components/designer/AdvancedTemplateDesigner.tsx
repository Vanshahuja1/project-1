import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, Textbox, FabricImage, Line, Triangle, Polygon, Ellipse, Gradient } from 'fabric';
import { gradientConfigToFabric } from './DesignerGradientPicker';
import { DesignerToolbar, ToolType } from './DesignerToolbar';
import { DesignerToolsSidebar, SidebarTab, ToolType as SidebarToolType } from './DesignerToolsSidebar';
import { DesignerElementsPanel } from './DesignerElementsPanel';
import { DesignerPropertiesPanel } from './DesignerPropertiesPanel';
import { DesignerLayersPanel } from './DesignerLayersPanel';
import { DesignerLayoutPanel } from './DesignerLayoutPanel';
import { DesignerBackgroundPanel } from './DesignerBackgroundPanel';
import { DesignerImagesPanel, PhotoShape } from './DesignerImagesPanel';
import { DesignerExportPanel } from './DesignerExportPanel';
import { DesignerCodeGenerator } from './DesignerCodeGenerator';
import { DesignerSignatureField } from './DesignerSignatureField';
import { DesignerContextMenu } from './DesignerContextMenu';
import { DesignerDataPreviewPanel } from './DesignerDataPreviewPanel';
import { DesignerTextToolbar } from './DesignerTextToolbar';
import { DesignerLibraryPanel } from './DesignerLibraryPanel';
import { DesignerBatchPDFPanel } from './DesignerBatchPDFPanel';
import { DesignerHeader } from './DesignerHeader';
import { DesignerCanvasToolbar } from './DesignerCanvasToolbar';
import { DesignerPageManager, PageData } from './DesignerPageManager';
import { CanvasOverlays } from './CanvasOverlays';
import { CanvasRuler } from './CanvasRuler';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRESET_SIZES = [
  { name: 'ID Card (CR80)', width: 85.6, height: 53.98 },
  { name: 'ID Card Portrait', width: 53.98, height: 85.6 },
  { name: 'A4', width: 210, height: 297 },
  { name: 'A5', width: 148, height: 210 },
  { name: 'A6', width: 105, height: 148 },
  { name: 'Business Card', width: 85, height: 55 },
  { name: 'Certificate', width: 297, height: 210 },
  { name: 'Badge (Round)', width: 75, height: 75 },
  { name: 'Custom', width: 0, height: 0 },
];

interface AdvancedTemplateDesignerProps {
  editTemplate?: any;
  onBack?: () => void;
}

export function AdvancedTemplateDesigner({ editTemplate, onBack }: AdvancedTemplateDesignerProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [backFabricCanvas, setBackFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [hasBackSide, setHasBackSide] = useState(false);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [clipboard, setClipboard] = useState<any>(null);

  // History for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryAction, setIsHistoryAction] = useState(false);

  // Template settings
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [category, setCategory] = useState('ID Card');
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [isPublic, setIsPublic] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sidebar state
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab | null>(null);

  // Margin settings
  const [marginTop, setMarginTop] = useState(1);
  const [marginLeft, setMarginLeft] = useState(1);
  const [marginRight, setMarginRight] = useState(1);
  const [marginBottom, setMarginBottom] = useState(1);

  // Background state
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [hasBackgroundImage, setHasBackgroundImage] = useState(false);

  // Snap to grid state
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);

  // Custom fonts and shapes
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [customShapes, setCustomShapes] = useState<{ name: string; url: string }[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Multi-page state
  const [pages, setPages] = useState<PageData[]>([
    { id: crypto.randomUUID(), name: 'Page 1', designJson: null }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Store last used text settings for new text elements
  const lastTextSettingsRef = useRef({
    fontSize: 14,
    fontFamily: 'Arial',
    fill: '#000000',
    textCase: 'none' as 'none' | 'uppercase' | 'lowercase' | 'capitalize',
    autoFontSize: false,
    wordWrap: true,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeCanvas = activeSide === 'front' ? fabricCanvas : backFabricCanvas;

  // Fetch vendor_id for the current user
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch library shapes for the vendor (to use as profile pic masks)
  const { data: libraryShapes = [] } = useQuery({
    queryKey: ['library-shapes-for-designer', vendorData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_shapes')
        .select('id, name, shape_url, is_public, vendor_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorData?.id,
  });

  // Combine local custom shapes with library shapes
  const allCustomShapes = [
    ...customShapes,
    ...libraryShapes.map((s: any) => ({ name: s.name, url: s.shape_url }))
  ];

  // Convert mm to pixels (96 DPI / 25.4)
  const mmToPixels = 3.78;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: widthMm * mmToPixels,
      height: heightMm * mmToPixels,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: false, // Disable to prevent blurry text
      imageSmoothingEnabled: false, // Disable for sharper text rendering
    });

    // Set selection style for dotted borders
    canvas.selectionBorderColor = 'hsl(var(--primary))';
    canvas.selectionLineWidth = 1;

    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
      setActiveTool('select');
    });
    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    canvas.on('object:modified', (e) => {
      saveToHistory();
      updateObjectsList();

      // Handle text scaling - adjust font size instead of scale for crisp text
      const obj = e.target as any;
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text')) {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        if (scaleX !== 1 || scaleY !== 1) {
          const currentFontSize = obj.fontSize || 16;
          const newFontSize = Math.round(currentFontSize * Math.max(scaleX, scaleY));
          obj.set({
            fontSize: newFontSize,
            scaleX: 1,
            scaleY: 1,
            width: (obj.width || 100) * scaleX,
          });
          canvas.requestRenderAll();
        }
      }
    });
    canvas.on('object:added', () => {
      if (!isHistoryAction) saveToHistory();
      updateObjectsList();
    });
    canvas.on('object:removed', () => {
      if (!isHistoryAction) saveToHistory();
      updateObjectsList();
    });

    // Snap to grid on object moving
    canvas.on('object:moving', (e) => {
      if (snapToGrid && e.target) {
        const obj = e.target;
        obj.set({
          left: Math.round((obj.left || 0) / gridSize) * gridSize,
          top: Math.round((obj.top || 0) / gridSize) * gridSize,
        });
      }
    });

    setFabricCanvas(canvas);

    // Initial history save
    setTimeout(() => {
      setHistory([JSON.stringify(canvas.toObject())]);
      setHistoryIndex(0);
    }, 100);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.lowerCanvasEl) return;
    try {
      fabricCanvas.setDimensions({
        width: widthMm * mmToPixels,
        height: heightMm * mmToPixels,
      });
      fabricCanvas.requestRenderAll();
    } catch (e) {
      // Canvas may have been disposed
    }
  }, [widthMm, heightMm, fabricCanvas]);

  // Smart alignment guides and snap-to-grid behavior
  useEffect(() => {
    if (!fabricCanvas) return;

    const aligningLineMargin = 5; // Threshold for showing alignment guides
    const aligningLineOffset = 5;
    const aligningLineColor = 'hsl(var(--primary))';
    const aligningLineWidth = 1;

    let verticalLines: any[] = [];
    let horizontalLines: any[] = [];

    const clearGuidelines = () => {
      verticalLines.forEach(line => fabricCanvas.remove(line));
      horizontalLines.forEach(line => fabricCanvas.remove(line));
      verticalLines = [];
      horizontalLines = [];
    };

    const drawVerticalLine = (x: number) => {
      const line = new Line([x, 0, x, fabricCanvas.height || 0], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        data: { isGuideline: true },
      });
      verticalLines.push(line);
      fabricCanvas.add(line);
    };

    const drawHorizontalLine = (y: number) => {
      const line = new Line([0, y, fabricCanvas.width || 0, y], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        data: { isGuideline: true },
      });
      horizontalLines.push(line);
      fabricCanvas.add(line);
    };

    const handleObjectMoving = (e: any) => {
      const movingObj = e.target;
      if (!movingObj) return;

      // Clear previous guidelines
      clearGuidelines();

      // Apply grid snapping if enabled - snap at the end after alignment
      if (snapToGrid) {
        const snappedLeft = Math.round((movingObj.left || 0) / gridSize) * gridSize;
        const snappedTop = Math.round((movingObj.top || 0) / gridSize) * gridSize;
        movingObj.set({
          left: snappedLeft,
          top: snappedTop,
        });
      }

      // Update coords before getting bounds for accurate measurements
      movingObj.setCoords();

      // Get moving object bounds (use absolute position for alignment)
      const movingLeft = movingObj.left || 0;
      const movingTop = movingObj.top || 0;
      const movingWidth = (movingObj.width || 0) * (movingObj.scaleX || 1);
      const movingHeight = (movingObj.height || 0) * (movingObj.scaleY || 1);
      const movingCenterX = movingLeft + movingWidth / 2;
      const movingCenterY = movingTop + movingHeight / 2;
      const movingRight = movingLeft + movingWidth;
      const movingBottom = movingTop + movingHeight;

      // Check alignment with other objects
      fabricCanvas.getObjects().forEach((obj: any) => {
        if (obj === movingObj || obj.data?.isGuideline) return;

        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);
        const objCenterX = objLeft + objWidth / 2;
        const objCenterY = objTop + objHeight / 2;
        const objRight = objLeft + objWidth;
        const objBottom = objTop + objHeight;

        // Vertical alignments (left, center, right)
        if (Math.abs(movingLeft - objLeft) < aligningLineMargin) {
          drawVerticalLine(objLeft);
          movingObj.set('left', objLeft);
        }
        if (Math.abs(movingCenterX - objCenterX) < aligningLineMargin) {
          drawVerticalLine(objCenterX);
          movingObj.set('left', objCenterX - movingWidth / 2);
        }
        if (Math.abs(movingRight - objRight) < aligningLineMargin) {
          drawVerticalLine(objRight);
          movingObj.set('left', objRight - movingWidth);
        }

        // Horizontal alignments (top, center, bottom)
        if (Math.abs(movingTop - objTop) < aligningLineMargin) {
          drawHorizontalLine(objTop);
          movingObj.set('top', objTop);
        }
        if (Math.abs(movingCenterY - objCenterY) < aligningLineMargin) {
          drawHorizontalLine(objCenterY);
          movingObj.set('top', objCenterY - movingHeight / 2);
        }
        if (Math.abs(movingBottom - objBottom) < aligningLineMargin) {
          drawHorizontalLine(objBottom);
          movingObj.set('top', objBottom - movingHeight);
        }
      });

      // Check canvas center alignment
      const canvasWidth = (fabricCanvas.width || 0) / (fabricCanvas.getZoom() || 1);
      const canvasHeight = (fabricCanvas.height || 0) / (fabricCanvas.getZoom() || 1);

      if (Math.abs(movingCenterX - canvasWidth / 2) < aligningLineMargin) {
        drawVerticalLine(canvasWidth / 2);
        movingObj.set('left', canvasWidth / 2 - movingWidth / 2);
      }
      if (Math.abs(movingCenterY - canvasHeight / 2) < aligningLineMargin) {
        drawHorizontalLine(canvasHeight / 2);
        movingObj.set('top', canvasHeight / 2 - movingHeight / 2);
      }

      // Update coords after any snapping adjustments
      movingObj.setCoords();
    };

    const handleMouseUp = () => {
      clearGuidelines();
      fabricCanvas.requestRenderAll();
    };

    fabricCanvas.off('object:moving');
    fabricCanvas.off('mouse:up');
    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('mouse:up', handleMouseUp);
      clearGuidelines();
    };
  }, [fabricCanvas, snapToGrid, gridSize]);

  // Initialize back canvas when enabled
  useEffect(() => {
    if (!hasBackSide || !backCanvasRef.current || backFabricCanvas) return;

    const canvas = new FabricCanvas(backCanvasRef.current, {
      width: widthMm * mmToPixels,
      height: heightMm * mmToPixels,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: false, // Disable to prevent blurry text
      imageSmoothingEnabled: false, // Disable for sharper text rendering
    });

    // Set selection style for dotted borders
    canvas.selectionBorderColor = 'hsl(var(--primary))';
    canvas.selectionLineWidth = 1;

    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
      setActiveTool('select');
    });
    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        selected.set({
          borderColor: 'hsl(var(--primary))',
          borderDashArray: [4, 4],
          cornerColor: 'hsl(var(--primary))',
          cornerSize: 8,
          cornerStyle: 'circle',
          transparentCorners: false,
        });
        canvas.requestRenderAll();
      }
      setSelectedObject(selected);
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    canvas.on('object:modified', (e) => {
      updateObjectsList();

      // Handle text scaling - adjust font size instead of scale for crisp text
      const obj = e.target as any;
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text')) {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        if (scaleX !== 1 || scaleY !== 1) {
          const currentFontSize = obj.fontSize || 16;
          const newFontSize = Math.round(currentFontSize * Math.max(scaleX, scaleY));
          obj.set({
            fontSize: newFontSize,
            scaleX: 1,
            scaleY: 1,
            width: (obj.width || 100) * scaleX,
          });
          canvas.requestRenderAll();
        }
      }
    });
    canvas.on('object:added', updateObjectsList);
    canvas.on('object:removed', updateObjectsList);

    // Snap to grid for back canvas
    canvas.on('object:moving', (e) => {
      if (snapToGrid && e.target) {
        const obj = e.target;
        obj.set({
          left: Math.round((obj.left || 0) / gridSize) * gridSize,
          top: Math.round((obj.top || 0) / gridSize) * gridSize,
        });
      }
    });

    setBackFabricCanvas(canvas);

    return () => {
      canvas.dispose();
      setBackFabricCanvas(null);
    };
  }, [hasBackSide, snapToGrid, gridSize]);

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
        const designJson = editTemplate.design_json;

        // Check if template has multi-page data
        if (designJson.__pages && Array.isArray(designJson.__pages)) {
          // Load pages from saved data
          const loadedPages: PageData[] = designJson.__pages.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.name || 'Page',
            designJson: p.designJson,
          }));
          setPages(loadedPages);
          setCurrentPageIndex(0);

          // Load first page content
          if (loadedPages[0]?.designJson) {
            // Remove __pages from the design JSON before loading
            const cleanDesign = { ...loadedPages[0].designJson };
            delete cleanDesign.__pages;
            fabricCanvas.loadFromJSON(cleanDesign).then(() => {
              fabricCanvas.requestRenderAll();
              updateObjectsList();
            });
          }
        } else {
          // Legacy single-page template - create a single page from it
          const cleanDesign = { ...designJson };
          delete cleanDesign.__pages;
          setPages([{ id: crypto.randomUUID(), name: 'Page 1', designJson: cleanDesign }]);
          setCurrentPageIndex(0);

          fabricCanvas.loadFromJSON(cleanDesign).then(() => {
            fabricCanvas.requestRenderAll();
            updateObjectsList();
          });
        }
      }
    }
  }, [editTemplate, fabricCanvas]);

  const updateObjectsList = useCallback(() => {
    const canvas = activeSide === 'front' ? fabricCanvas : backFabricCanvas;
    if (!canvas) return;
    const canvasObjects = canvas.getObjects().filter((obj: any) => !obj.data?.isGuideline);
    setObjects([...canvasObjects]);
  }, [activeSide, fabricCanvas, backFabricCanvas]);

  // Update objects list when canvas or active side changes
  useEffect(() => {
    updateObjectsList();
  }, [updateObjectsList]);

  const saveToHistory = useCallback(() => {
    if (!activeCanvas || isHistoryAction) return;

    const json = JSON.stringify(activeCanvas.toObject());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(json);

    // Keep only last 50 states
    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [activeCanvas, history, historyIndex, isHistoryAction]);

  // Arrow key movement for selected objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCanvas) return;
      const activeObject = activeCanvas.getActiveObject();
      if (!activeObject) return;

      // Don't handle if we're editing text
      if (activeObject.type === 'textbox' && (activeObject as any).isEditing) return;

      const moveAmount = e.shiftKey ? 10 : 1; // Shift for larger moves
      let moved = false;

      switch (e.key) {
        case 'ArrowUp':
          activeObject.set('top', (activeObject.top || 0) - moveAmount);
          moved = true;
          break;
        case 'ArrowDown':
          activeObject.set('top', (activeObject.top || 0) + moveAmount);
          moved = true;
          break;
        case 'ArrowLeft':
          activeObject.set('left', (activeObject.left || 0) - moveAmount);
          moved = true;
          break;
        case 'ArrowRight':
          activeObject.set('left', (activeObject.left || 0) + moveAmount);
          moved = true;
          break;
      }

      if (moved) {
        e.preventDefault();
        activeObject.setCoords();
        activeCanvas.requestRenderAll();
        saveToHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCanvas, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || !activeCanvas) return;

    setIsHistoryAction(true);
    const newIndex = historyIndex - 1;
    activeCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
      activeCanvas.requestRenderAll();
      updateObjectsList();
      setHistoryIndex(newIndex);
      setIsHistoryAction(false);
    });
  }, [activeCanvas, history, historyIndex, updateObjectsList]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !activeCanvas) return;

    setIsHistoryAction(true);
    const newIndex = historyIndex + 1;
    activeCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
      activeCanvas.requestRenderAll();
      updateObjectsList();
      setHistoryIndex(newIndex);
      setIsHistoryAction(false);
    });
  }, [activeCanvas, history, historyIndex, updateObjectsList]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const newZoom = direction === 'in'
      ? Math.min(zoom * 1.2, 3)
      : Math.max(zoom / 1.2, 0.25);
    setZoom(newZoom);

    // Apply zoom to canvas viewport for better quality
    if (activeCanvas) {
      activeCanvas.setZoom(newZoom);
      activeCanvas.setWidth(widthMm * mmToPixels * newZoom);
      activeCanvas.setHeight(heightMm * mmToPixels * newZoom);
      activeCanvas.requestRenderAll();
    }
  }, [zoom, activeCanvas, widthMm, heightMm]);

  const addShape = useCallback((type: string) => {
    if (!activeCanvas) return;

    let shape: any;
    const canvasWidth = (widthMm * mmToPixels) / zoom;
    const canvasHeight = (heightMm * mmToPixels) / zoom;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate max size to fit within template
    const maxWidth = Math.min(100, canvasWidth * 0.4);
    const maxHeight = Math.min(60, canvasHeight * 0.4);

    switch (type) {
      case 'rect':
        shape = new Rect({
          left: Math.max(5, centerX - maxWidth / 2),
          top: Math.max(5, centerY - maxHeight / 2),
          width: maxWidth,
          height: maxHeight,
          fill: '#3b82f6',
          stroke: '#1d4ed8',
          strokeWidth: 0,
          rx: 0,
          ry: 0,
        });
        break;
      case 'rounded-rect':
        shape = new Rect({
          left: Math.max(5, centerX - maxWidth / 2),
          top: Math.max(5, centerY - maxHeight / 2),
          width: maxWidth,
          height: maxHeight,
          fill: '#3b82f6',
          rx: 10,
          ry: 10,
        });
        break;
      case 'circle':
        const radius = Math.min(40, canvasWidth * 0.15, canvasHeight * 0.15);
        shape = new Circle({
          left: Math.max(5, centerX - radius),
          top: Math.max(5, centerY - radius),
          radius: radius,
          fill: '#10b981',
        });
        break;
      case 'ellipse':
        const ellipseRadius = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        shape = new Circle({
          left: Math.max(5, centerX - ellipseRadius * 1.5),
          top: Math.max(5, centerY - ellipseRadius * 0.75),
          radius: ellipseRadius,
          fill: '#10b981',
          scaleX: 1.5,
          scaleY: 0.75,
        });
        break;
      case 'triangle':
        const triSize = Math.min(80, canvasWidth * 0.3, canvasHeight * 0.3);
        shape = new Triangle({
          left: Math.max(5, centerX - triSize / 2),
          top: Math.max(5, centerY - triSize * 0.45),
          width: triSize,
          height: triSize * 0.87,
          fill: '#f59e0b',
        });
        break;
      case 'star':
        const starSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const starPoints = createStarPoints(5, starSize, starSize / 2);
        shape = new Polygon(starPoints, {
          left: Math.max(5, centerX - starSize),
          top: Math.max(5, centerY - starSize),
          fill: '#eab308',
        });
        break;
      case 'polygon':
        const hexSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const hexPoints = createPolygonPoints(6, hexSize);
        shape = new Polygon(hexPoints, {
          left: Math.max(5, centerX - hexSize),
          top: Math.max(5, centerY - hexSize),
          fill: '#8b5cf6',
        });
        break;
      case 'pentagon':
        const pentSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const pentPoints = createPolygonPoints(5, pentSize);
        shape = new Polygon(pentPoints, {
          left: Math.max(5, centerX - pentSize),
          top: Math.max(5, centerY - pentSize),
          fill: '#ec4899',
        });
        break;
      case 'diamond':
        const diamondSize = Math.min(40, canvasWidth * 0.12, canvasHeight * 0.12);
        const diamondPoints = [
          { x: diamondSize, y: 0 },
          { x: diamondSize * 2, y: diamondSize },
          { x: diamondSize, y: diamondSize * 2 },
          { x: 0, y: diamondSize },
        ];
        shape = new Polygon(diamondPoints, {
          left: Math.max(5, centerX - diamondSize),
          top: Math.max(5, centerY - diamondSize),
          fill: '#14b8a6',
        });
        break;
      case 'line':
        const lineWidth = Math.min(100, canvasWidth * 0.4);
        shape = new Line([0, 0, lineWidth, 0], {
          left: Math.max(5, centerX - lineWidth / 2),
          top: centerY,
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'arrow':
        const arrowWidth = Math.min(100, canvasWidth * 0.4);
        shape = new Line([0, 0, arrowWidth, 0], {
          left: Math.max(5, centerX - arrowWidth / 2),
          top: centerY,
          stroke: '#000000',
          strokeWidth: 3,
        });
        break;
      default:
        return;
    }

    if (shape) {
      activeCanvas.add(shape);
      activeCanvas.setActiveObject(shape);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
    }
  }, [activeCanvas, widthMm, heightMm, zoom]);

  const addText = useCallback((text: string, isVariable = false) => {
    if (!activeCanvas) return;

    const canvasWidth = (widthMm * mmToPixels) / zoom;
    const canvasHeight = (heightMm * mmToPixels) / zoom;

    // Calculate text width that fits within template
    const maxTextWidth = Math.min(150, canvasWidth * 0.8);

    // Use last text settings for variables, custom settings for headings
    const lastSettings = lastTextSettingsRef.current;
    let fontSize = lastSettings.fontSize;
    let fontFamily = lastSettings.fontFamily;
    let fontWeight: string | number = 'normal';
    let fill = lastSettings.fill;

    if (!isVariable) {
      if (text === 'Heading') {
        fontSize = Math.min(32, canvasHeight * 0.15);
        fontWeight = 'bold';
      } else if (text === 'Subheading') {
        fontSize = Math.min(24, canvasHeight * 0.12);
        fontWeight = '600';
      } else {
        fontSize = Math.min(16, canvasHeight * 0.08);
      }
    }

    // Position text within template bounds
    const textLeft = Math.max(5, (canvasWidth - maxTextWidth) / 2);
    const textTop = Math.max(5, (canvasHeight - fontSize) / 2);

    // Apply text case transformation
    let displayText = text;
    if (isVariable && lastSettings.textCase !== 'none') {
      // Don't transform variable placeholders, but store the setting
    }

    const textbox = new Textbox(displayText, {
      left: textLeft,
      top: textTop,
      fontSize,
      fontFamily,
      fill, // Use last selected color
      fontWeight,
      editable: true,
      width: maxTextWidth,
      backgroundColor: '', // No background by default
      stroke: '',
      strokeWidth: 0,
      padding: 0,
      splitByGrapheme: lastSettings.wordWrap, // Word wrap support
      data: {
        type: isVariable ? 'variable' : 'text',
        field: isVariable ? text.replace(/[{}]/g, '') : undefined,
        isVariableField: isVariable,
        textCase: lastSettings.textCase,
        autoFontSize: lastSettings.autoFontSize,
        wordWrap: lastSettings.wordWrap,
      },
    });

    // Add custom styling for selection
    textbox.set({
      borderColor: 'hsl(var(--primary))',
      borderDashArray: [4, 4],
      cornerColor: 'hsl(var(--primary))',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    });

    activeCanvas.add(textbox);
    activeCanvas.setActiveObject(textbox);
    activeCanvas.requestRenderAll();
    setActiveTool('select');
  }, [activeCanvas, widthMm, heightMm, zoom]);

  const addImage = useCallback((file: File) => {
    if (!activeCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        const maxWidth = (widthMm * mmToPixels) * 0.5;
        const maxHeight = (heightMm * mmToPixels) * 0.5;

        if (img.width && img.height) {
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
          img.scale(scale);
        }

        img.set({
          left: 50,
          top: 50,
        });

        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.requestRenderAll();
        setActiveTool('select');
      });
    };
    reader.readAsDataURL(file);
  }, [activeCanvas, widthMm, heightMm]);

  const addPlaceholder = useCallback((type: 'photo' | 'barcode' | 'qrcode', shape: PhotoShape = 'rect', customMaskUrl?: string) => {
    if (!activeCanvas) return;

    const canvasWidth = (widthMm * mmToPixels) / zoom;
    const canvasHeight = (heightMm * mmToPixels) / zoom;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate placeholder size that fits within template
    const maxPhotoWidth = Math.min(80, canvasWidth * 0.35);
    const maxPhotoHeight = Math.min(100, canvasHeight * 0.45);
    const photoRadius = Math.min(40, canvasWidth * 0.15, canvasHeight * 0.15);

    let fabricObj: any;

    if (type === 'photo') {
      const width = maxPhotoWidth;
      const height = maxPhotoHeight;

      // Handle custom mask
      if (shape === 'custom' && customMaskUrl) {
        FabricImage.fromURL(customMaskUrl, { crossOrigin: 'anonymous' }).then((img) => {
          const maxSize = Math.min(100, canvasWidth * 0.4, canvasHeight * 0.4);
          if (img.width && img.height) {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            img.scale(scale);
          }

          img.set({
            left: Math.max(5, centerX - maxSize / 2),
            top: Math.max(5, centerY - maxSize / 2),
            data: { type: 'variable', field: 'photo', isPhoto: true, shape: 'custom', customMaskUrl },
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });

          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          activeCanvas.requestRenderAll();
          setActiveTool('select');
          toast.success('Custom photo placeholder added');
        });
        return;
      }

      switch (shape) {
        case 'circle':
          fabricObj = new Circle({
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            radius: photoRadius,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'circle' });
          break;
        case 'ellipse':
          fabricObj = new Circle({
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius * 1.25),
            radius: photoRadius,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            scaleX: 1,
            scaleY: 1.25,
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'ellipse' });
          break;
        case 'rounded-rect':
          fabricObj = new Rect({
            left: Math.max(5, centerX - width / 2),
            top: Math.max(5, centerY - height / 2),
            width,
            height,
            rx: 15,
            ry: 15,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'rounded-rect' });
          break;
        case 'hexagon':
          const hexPoints = createPolygonPoints(6, photoRadius);
          fabricObj = new Polygon(hexPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'hexagon' });
          break;
        case 'star':
          const starPts = createStarPoints(5, photoRadius, photoRadius / 2);
          fabricObj = new Polygon(starPts, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'star' });
          break;
        case 'heart':
          const heartPoints = createHeartPoints(photoRadius);
          fabricObj = new Polygon(heartPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'heart' });
          break;
        case 'octagon':
          const octPoints = createPolygonPoints(8, photoRadius);
          fabricObj = new Polygon(octPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'octagon' });
          break;
        case 'pentagon':
          const pentPoints = createPolygonPoints(5, photoRadius);
          fabricObj = new Polygon(pentPoints, {
            left: Math.max(5, centerX - photoRadius),
            top: Math.max(5, centerY - photoRadius),
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'pentagon' });
          break;
        case 'rect':
        default:
          fabricObj = new Rect({
            left: Math.max(5, centerX - width / 2),
            top: Math.max(5, centerY - height / 2),
            width,
            height,
            fill: '#e5e7eb',
            stroke: '#9ca3af',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
          });
          fabricObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: 'rect' });
          break;
      }
    } else if (type === 'barcode') {
      const barcodeWidth = Math.min(120, canvasWidth * 0.5);
      const barcodeHeight = Math.min(40, canvasHeight * 0.2);
      fabricObj = new Rect({
        left: Math.max(5, centerX - barcodeWidth / 2),
        top: Math.max(5, centerY - barcodeHeight / 2),
        width: barcodeWidth,
        height: barcodeHeight,
        fill: '#f3f4f6',
        stroke: '#d1d5db',
        strokeWidth: 1,
      });
      fabricObj.set('data', { type: 'variable', field: 'barcode', isBarcode: true });

      // Add barcode lines visual indicator
      const barcodeText = new Textbox('||||||||||||||||', {
        left: centerX - 55,
        top: centerY - 15,
        fontSize: 24,
        fontFamily: 'Courier New',
        fill: '#374151',
        selectable: false,
        evented: false,
      });
      barcodeText.set('data', { isBarcodeVisual: true });
      activeCanvas.add(barcodeText);
    } else if (type === 'qrcode') {
      fabricObj = new Rect({
        left: centerX - 30,
        top: centerY - 30,
        width: 60,
        height: 60,
        fill: '#f3f4f6',
        stroke: '#d1d5db',
        strokeWidth: 1,
      });
      fabricObj.set('data', { type: 'variable', field: 'qr_code', isQR: true });

      // Add QR visual indicator
      const qrText = new Textbox('QR', {
        left: centerX - 12,
        top: centerY - 8,
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#6b7280',
        selectable: false,
        evented: false,
      });
      qrText.set('data', { isQRVisual: true });
      activeCanvas.add(qrText);
    }

    if (fabricObj) {
      activeCanvas.add(fabricObj);
      activeCanvas.setActiveObject(fabricObj);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} placeholder added`);
    }
  }, [activeCanvas, widthMm, heightMm]);

  // Custom font handler
  const handleAddCustomFont = useCallback(async (file: File, fontName: string) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fontData = e.target?.result as ArrayBuffer;
        const fontFace = new FontFace(fontName, fontData);
        await fontFace.load();
        document.fonts.add(fontFace);
        setCustomFonts(prev => [...prev, fontName]);
        toast.success(`Font "${fontName}" loaded successfully`);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error('Failed to load font');
    }
  }, []);

  // Custom shape handler
  const handleAddCustomShape = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const name = file.name.replace(/\.[^/.]+$/, '');
      setCustomShapes(prev => [...prev, { name, url }]);
      toast.success(`Shape "${name}" uploaded`);
    };
    reader.readAsDataURL(file);
  }, []);

  // Add custom shape to canvas
  const addCustomShapeToCanvas = useCallback((shapeUrl: string, shapeName: string) => {
    if (!activeCanvas) return;

    const centerX = (widthMm * mmToPixels) / 2 / zoom;
    const centerY = (heightMm * mmToPixels) / 2 / zoom;

    FabricImage.fromURL(shapeUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const maxSize = 100;
      if (img.width && img.height) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      img.set({
        left: centerX - 50,
        top: centerY - 50,
        data: { type: 'customShape', name: shapeName },
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
      toast.success(`Shape "${shapeName}" added`);
    }).catch(() => {
      toast.error('Failed to load shape');
    });
  }, [activeCanvas, widthMm, heightMm, zoom]);

  // Add icon to canvas
  const addIconToCanvas = useCallback((iconName: string, iconUrl: string) => {
    if (!activeCanvas) return;

    const centerX = (widthMm * mmToPixels) / 2 / zoom;
    const centerY = (heightMm * mmToPixels) / 2 / zoom;

    FabricImage.fromURL(iconUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const maxSize = 50; // Icons are typically smaller
      if (img.width && img.height) {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      img.set({
        left: centerX - 25,
        top: centerY - 25,
        data: { type: 'icon', name: iconName },
      });

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.requestRenderAll();
      setActiveTool('select');
      toast.success(`Icon "${iconName}" added`);
    }).catch(() => {
      toast.error('Failed to load icon');
    });
  }, [activeCanvas, widthMm, heightMm, zoom]);

  // Change photo placeholder shape
  const changePhotoPlaceholderShape = useCallback((newShape: PhotoShape, customMaskUrl?: string) => {
    if (!selectedObject || !activeCanvas) return;

    // Check if selected object is a photo placeholder
    const objData = selectedObject.data;
    if (!objData?.isPhoto) return;

    // Get current position and size
    const bounds = selectedObject.getBoundingRect();
    const left = selectedObject.left || 0;
    const top = selectedObject.top || 0;
    const currentWidth = bounds.width / (activeCanvas.getZoom() || 1);
    const currentHeight = bounds.height / (activeCanvas.getZoom() || 1);

    // Remove old object
    activeCanvas.remove(selectedObject);

    // Handle custom mask
    if (newShape === 'custom' && customMaskUrl) {
      FabricImage.fromURL(customMaskUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (img.width && img.height) {
          const scale = Math.min(currentWidth / img.width, currentHeight / img.height);
          img.scale(scale);
        }

        img.set({
          left,
          top,
          data: { type: 'variable', field: 'photo', isPhoto: true, shape: 'custom', customMaskUrl },
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });

        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.requestRenderAll();
        setSelectedObject(img);
        toast.success('Photo shape changed to custom');
      });
      return;
    }

    // Create new object with same position but new shape
    let newObj: any;

    switch (newShape) {
      case 'circle':
        newObj = new Circle({
          left,
          top,
          radius: Math.min(currentWidth, currentHeight) / 2,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'ellipse':
        newObj = new Circle({
          left,
          top,
          radius: 40,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          scaleX: currentWidth / 80,
          scaleY: currentHeight / 80,
        });
        break;
      case 'rounded-rect':
        newObj = new Rect({
          left,
          top,
          width: currentWidth,
          height: currentHeight,
          rx: 15,
          ry: 15,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'hexagon':
        const hexPoints = createPolygonPoints(6, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(hexPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'star':
        const starPts = createStarPoints(5, Math.min(currentWidth, currentHeight) / 2, Math.min(currentWidth, currentHeight) / 4);
        newObj = new Polygon(starPts, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'heart':
        const heartPoints = createHeartPoints(Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(heartPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'octagon':
        const octPoints = createPolygonPoints(8, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(octPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'pentagon':
        const pentPoints = createPolygonPoints(5, Math.min(currentWidth, currentHeight) / 2);
        newObj = new Polygon(pentPoints, {
          left,
          top,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
      case 'rect':
      default:
        newObj = new Rect({
          left,
          top,
          width: currentWidth,
          height: currentHeight,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        break;
    }

    newObj.set('data', { type: 'variable', field: 'photo', isPhoto: true, shape: newShape });
    activeCanvas.add(newObj);
    activeCanvas.setActiveObject(newObj);
    activeCanvas.requestRenderAll();
    setSelectedObject(newObj);
    toast.success(`Photo shape changed to ${newShape}`);
  }, [selectedObject, activeCanvas]);

  const handleDelete = useCallback(() => {
    if (!activeCanvas) return;
    const activeObjects = activeCanvas.getActiveObjects();
    activeObjects.forEach((obj) => activeCanvas.remove(obj));
    activeCanvas.discardActiveObject();
    activeCanvas.requestRenderAll();
    setSelectedObject(null);
  }, [activeCanvas]);

  const handleCopy = useCallback(() => {
    if (!selectedObject) return;
    selectedObject.clone().then((cloned: any) => {
      setClipboard(cloned);
      toast.success('Copied to clipboard');
    });
  }, [selectedObject]);

  const handlePaste = useCallback(() => {
    if (!clipboard || !activeCanvas) return;
    clipboard.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      activeCanvas.add(cloned);
      activeCanvas.setActiveObject(cloned);
      activeCanvas.requestRenderAll();
    });
  }, [clipboard, activeCanvas]);

  // Background handlers
  const handleBackgroundColorChange = useCallback((color: string) => {
    setBackgroundColor(color);
    if (activeCanvas) {
      activeCanvas.backgroundColor = color;
      activeCanvas.requestRenderAll();
    }
  }, [activeCanvas]);

  const handleBackgroundGradientChange = useCallback((gradientConfig: any) => {
    if (!activeCanvas) return;

    try {
      const canvasWidth = widthMm * mmToPixels;
      const canvasHeight = heightMm * mmToPixels;

      // Remove any existing gradient background rect
      const existingGradientBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
      if (existingGradientBg) {
        activeCanvas.remove(existingGradientBg);
      }

      const fabricGradientConfig = gradientConfigToFabric(gradientConfig, canvasWidth, canvasHeight);

      // Create gradient with proper Fabric.js v6 API
      const colorStops = Object.entries(fabricGradientConfig.colorStops).map(([offset, color]) => ({
        offset: parseFloat(offset),
        color: color as string,
      }));

      let gradient;
      if (fabricGradientConfig.type === 'radial') {
        gradient = new Gradient<'radial'>({
          type: 'radial',
          coords: fabricGradientConfig.coords as any,
          colorStops,
        });
      } else {
        gradient = new Gradient<'linear'>({
          type: 'linear',
          coords: fabricGradientConfig.coords,
          colorStops,
        });
      }

      // Create a full-canvas rect with gradient fill (canvas.backgroundColor doesn't support gradients)
      const gradientRect = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: gradient,
        selectable: false,
        evented: false,
        data: { isGradientBackground: true },
      });

      activeCanvas.add(gradientRect);
      activeCanvas.sendObjectToBack(gradientRect);

      // Clear solid background color since we're using gradient rect
      activeCanvas.backgroundColor = 'transparent';
      setBackgroundColor('transparent');

      activeCanvas.requestRenderAll();
    } catch (error) {
      console.error('Error applying gradient:', error);
      toast.error('Failed to apply gradient');
    }
  }, [activeCanvas, widthMm, heightMm]);

  const handleBackgroundImageChange = useCallback((file: File) => {
    if (!activeCanvas) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        const canvasWidth = widthMm * mmToPixels;
        const canvasHeight = heightMm * mmToPixels;

        if (img.width && img.height) {
          const scaleX = canvasWidth / img.width;
          const scaleY = canvasHeight / img.height;
          img.scaleX = scaleX;
          img.scaleY = scaleY;
        }

        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          data: { isBackground: true },
        });

        // Remove existing background image
        const existingBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isBackground);
        if (existingBg) activeCanvas.remove(existingBg);

        activeCanvas.add(img);
        activeCanvas.sendObjectToBack(img);
        activeCanvas.requestRenderAll();
        setHasBackgroundImage(true);
      });
    };
    reader.readAsDataURL(file);
  }, [activeCanvas, widthMm, heightMm]);

  const handleRemoveBackgroundImage = useCallback(() => {
    if (!activeCanvas) return;
    const bgImage = activeCanvas.getObjects().find((obj: any) => obj.data?.isBackground);
    if (bgImage) {
      activeCanvas.remove(bgImage);
      activeCanvas.requestRenderAll();
      setHasBackgroundImage(false);
    }
  }, [activeCanvas]);

  const handleRemoveBackgroundGradient = useCallback(() => {
    if (!activeCanvas) return;
    const gradientBg = activeCanvas.getObjects().find((obj: any) => obj.data?.isGradientBackground);
    if (gradientBg) {
      activeCanvas.remove(gradientBg);
      activeCanvas.requestRenderAll();
    }
  }, [activeCanvas]);

  // Alignment functions
  const alignLeft = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('left', 0);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const alignCenter = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasWidth = activeCanvas.width || 0;
    const objWidth = selectedObject.width * (selectedObject.scaleX || 1);
    selectedObject.set('left', (canvasWidth - objWidth) / 2);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const alignRight = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasWidth = activeCanvas.width || 0;
    const objWidth = selectedObject.width * (selectedObject.scaleX || 1);
    selectedObject.set('left', canvasWidth - objWidth);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const alignTop = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('top', 0);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const alignMiddle = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasHeight = activeCanvas.height || 0;
    const objHeight = selectedObject.height * (selectedObject.scaleY || 1);
    selectedObject.set('top', (canvasHeight - objHeight) / 2);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const alignBottom = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    const canvasHeight = activeCanvas.height || 0;
    const objHeight = selectedObject.height * (selectedObject.scaleY || 1);
    selectedObject.set('top', canvasHeight - objHeight);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const flipHorizontal = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const flipVertical = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    activeCanvas.requestRenderAll();
  }, [selectedObject, activeCanvas]);

  const bringForward = useCallback((obj?: any) => {
    const target = obj || selectedObject;
    if (!target || !activeCanvas) return;

    const allObjects = activeCanvas.getObjects();
    const index = allObjects.indexOf(target);
    if (index === -1) return;

    // Find next non-guideline object above
    let nextIndex = -1;
    for (let i = index + 1; i < allObjects.length; i++) {
      if (!allObjects[i].data?.isGuideline) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex !== -1) {
      const neighbor = allObjects[nextIndex];
      // Swap positions for vertical list management
      const targetLeft = target.left;
      const targetTop = target.top;
      target.set({ left: neighbor.left, top: neighbor.top });
      neighbor.set({ left: targetLeft, top: targetTop });

      // Sync Z-order
      activeCanvas.moveObjectTo(target, nextIndex);

      target.setCoords();
      neighbor.setCoords();
      activeCanvas.requestRenderAll();
      updateObjectsList();
      saveToHistory();
    }
  }, [selectedObject, activeCanvas, updateObjectsList, saveToHistory]);

  const sendBackward = useCallback((obj?: any) => {
    const target = obj || selectedObject;
    if (!target || !activeCanvas) return;

    const allObjects = activeCanvas.getObjects();
    const index = allObjects.indexOf(target);
    if (index === -1) return;

    // Find next non-guideline object below
    let prevIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (!allObjects[i].data?.isGuideline) {
        prevIndex = i;
        break;
      }
    }

    if (prevIndex !== -1) {
      const neighbor = allObjects[prevIndex];
      // Swap positions for vertical list management
      const targetLeft = target.left;
      const targetTop = target.top;
      target.set({ left: neighbor.left, top: neighbor.top });
      neighbor.set({ left: targetLeft, top: targetTop });

      // Sync Z-order
      activeCanvas.moveObjectTo(target, prevIndex);

      target.setCoords();
      neighbor.setCoords();
      activeCanvas.requestRenderAll();
      updateObjectsList();
      saveToHistory();
    }
  }, [selectedObject, activeCanvas, updateObjectsList, saveToHistory]);

  const toggleVisibility = useCallback((obj: any) => {
    if (!activeCanvas) return;
    obj.set('visible', !obj.visible);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [activeCanvas, updateObjectsList]);

  const toggleLock = useCallback((obj: any) => {
    if (!activeCanvas) return;
    const locked = obj.lockMovementX && obj.lockMovementY;
    obj.set({
      lockMovementX: !locked,
      lockMovementY: !locked,
      lockRotation: !locked,
      lockScalingX: !locked,
      lockScalingY: !locked,
      selectable: locked,
    });
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [activeCanvas, updateObjectsList]);

  const handleExport = useCallback(() => {
    if (!activeCanvas) return;
    const dataUrl = activeCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 3,
    });
    const link = document.createElement('a');
    link.download = `${templateName}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Template exported as PNG');
  }, [activeCanvas, templateName]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      activeCanvas.add(cloned);
      activeCanvas.setActiveObject(cloned);
      activeCanvas.requestRenderAll();
      toast.success('Object duplicated');
    });
  }, [selectedObject, activeCanvas]);

  const bringToFront = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    activeCanvas.bringObjectToFront(selectedObject);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [selectedObject, activeCanvas, updateObjectsList]);

  const sendToBack = useCallback(() => {
    if (!selectedObject || !activeCanvas) return;
    activeCanvas.sendObjectToBack(selectedObject);
    activeCanvas.requestRenderAll();
    updateObjectsList();
  }, [selectedObject, activeCanvas, updateObjectsList]);

  // Detect variables from canvas objects
  const extractVariables = useCallback(() => {
    if (!activeCanvas) return [];
    const variables: string[] = [];
    const variableRegex = /\{\{(\w+)\}\}/g;

    activeCanvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'textbox' && obj.text) {
        let match;
        while ((match = variableRegex.exec(obj.text)) !== null) {
          if (!variables.includes(match[1])) {
            variables.push(match[1]);
          }
        }
      }
      if (obj.data?.field) {
        if (!variables.includes(obj.data.field)) {
          variables.push(obj.data.field);
        }
      }
    });
    return variables;
  }, [activeCanvas]);

  // Update detected variables when objects change
  useEffect(() => {
    const vars = extractVariables();
    setDetectedVariables(vars);
  }, [objects, extractVariables]);

  // Data preview handlers
  const handlePreviewData = useCallback((data: Record<string, string>) => {
    if (!activeCanvas) return;
    setPreviewData(data);

    // Replace variable text with preview data
    activeCanvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'textbox' && obj.text) {
        // Store original text if not already stored
        if (!obj.data) obj.data = {};
        if (!obj.data.originalText) {
          obj.data.originalText = obj.text;
        }

        // Replace variables with data
        let newText = obj.data.originalText;
        Object.entries(data).forEach(([key, value]) => {
          newText = newText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
        obj.set('text', newText);
      }
    });
    activeCanvas.requestRenderAll();
  }, [activeCanvas]);

  const handleResetPreview = useCallback(() => {
    if (!activeCanvas) return;

    // Restore original text
    activeCanvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'textbox' && obj.data?.originalText) {
        obj.set('text', obj.data.originalText);
      }
    });
    activeCanvas.requestRenderAll();
  }, [activeCanvas]);

  const handleTogglePreviewMode = useCallback((enabled: boolean) => {
    setIsPreviewMode(enabled);
    if (!enabled) {
      handleResetPreview();
    }
  }, [handleResetPreview]);


  // Handle sidebar tool changes (pan, text click-to-add)
  const handleSidebarToolChange = useCallback((tool: SidebarToolType) => {
    if (tool === 'pan') {
      setActiveTool('pan' as ToolType);
      if (activeCanvas) {
        activeCanvas.selection = false;
        activeCanvas.defaultCursor = 'grab';
        activeCanvas.hoverCursor = 'grab';
      }
    } else if (tool === 'text') {
      setActiveTool('text');
      if (activeCanvas) {
        activeCanvas.selection = true;
        activeCanvas.defaultCursor = 'text';
        activeCanvas.hoverCursor = 'text';
      }
    } else {
      setActiveTool('select');
      if (activeCanvas) {
        activeCanvas.selection = true;
        activeCanvas.defaultCursor = 'default';
        activeCanvas.hoverCursor = 'move';
      }
    }
  }, [activeCanvas]);

  // Pan tool handlers
  useEffect(() => {
    if (!activeCanvas) return;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'pan') {
        setIsPanning(true);
        activeCanvas.defaultCursor = 'grabbing';
        setLastPanPosition({ x: opt.e.clientX, y: opt.e.clientY });
      } else if (activeTool === 'text' && !opt.target) {
        // Click to add text when text tool is active and clicking on empty canvas
        const pointer = activeCanvas.getPointer(opt.e);
        const textbox = new Textbox('Click to edit', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
          editable: true,
          width: 150,
        });
        activeCanvas.add(textbox);
        activeCanvas.setActiveObject(textbox);
        textbox.enterEditing();
        textbox.selectAll();
        activeCanvas.requestRenderAll();
        setActiveTool('select');
        activeCanvas.defaultCursor = 'default';
        activeCanvas.hoverCursor = 'move';
      }
    };

    const handleMouseMove = (opt: any) => {
      if (activeTool === 'pan' && isPanning && lastPanPosition) {
        const vpt = activeCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += opt.e.clientX - lastPanPosition.x;
          vpt[5] += opt.e.clientY - lastPanPosition.y;
          activeCanvas.requestRenderAll();
          setLastPanPosition({ x: opt.e.clientX, y: opt.e.clientY });
        }
      }
    };

    const handleMouseUp = () => {
      if (activeTool === 'pan') {
        setIsPanning(false);
        activeCanvas.defaultCursor = 'grab';
        setLastPanPosition(null);
      }
    };

    activeCanvas.on('mouse:down', handleMouseDown);
    activeCanvas.on('mouse:move', handleMouseMove);
    activeCanvas.on('mouse:up', handleMouseUp);

    return () => {
      activeCanvas.off('mouse:down', handleMouseDown);
      activeCanvas.off('mouse:move', handleMouseMove);
      activeCanvas.off('mouse:up', handleMouseUp);
    };
  }, [activeCanvas, activeTool, isPanning, lastPanPosition]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fabricCanvas || !templateName) {
        throw new Error('Please enter a template name');
      }

      // Save current page state first
      saveCurrentPageState();

      // Get current canvas state for the current page
      const currentDesignJson = fabricCanvas.toObject();

      // Build pages array with updated current page
      const updatedPages = pages.map((page, index) => ({
        id: page.id,
        name: page.name,
        designJson: index === currentPageIndex ? currentDesignJson : page.designJson,
      }));

      // Store first page as main design_json for backward compatibility
      // and all pages in a pages array within the design_json
      const designJson = {
        ...(updatedPages[0]?.designJson || currentDesignJson),
        __pages: updatedPages,
      };

      const backDesignJson = hasBackSide && backFabricCanvas
        ? backFabricCanvas.toObject()
        : null;

      // Use editTemplate's vendor_id for updates, or current user's vendor_id for new templates
      const vendorId = editTemplate?.vendor_id || vendorData?.id || null;

      const templateData = {
        name: templateName,
        category,
        width_mm: widthMm,
        height_mm: heightMm,
        is_public: isPublic,
        has_back_side: hasBackSide,
        design_json: designJson,
        back_design_json: backDesignJson,
        vendor_id: vendorId,
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
      setLastSaved(new Date());
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['templates-management'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!editTemplate?.id || !fabricCanvas) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setIsDirty(true);

    // Debounce auto-save by 3 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate();
      setIsDirty(false);
      setLastSaved(new Date());
    }, 3000);
  }, [editTemplate?.id, fabricCanvas, saveMutation]);

  // Trigger auto-save on canvas changes
  useEffect(() => {
    if (!activeCanvas || !editTemplate?.id) return;

    const handleChange = () => {
      triggerAutoSave();
    };

    activeCanvas.on('object:modified', handleChange);
    activeCanvas.on('object:added', handleChange);
    activeCanvas.on('object:removed', handleChange);

    return () => {
      activeCanvas.off('object:modified', handleChange);
      activeCanvas.off('object:added', handleChange);
      activeCanvas.off('object:removed', handleChange);
    };
  }, [activeCanvas, editTemplate?.id, triggerAutoSave]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Register context menu on canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleContextMenu]);

  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_SIZES.find(p => p.name === presetName);
    if (preset && preset.width > 0) {
      setWidthMm(preset.width);
      setHeightMm(preset.height);
    }
  };

  // Page management handlers
  const saveCurrentPageState = useCallback(() => {
    if (!fabricCanvas) return;
    setPages(prev => {
      const updated = [...prev];
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        designJson: fabricCanvas.toObject(),
      };
      return updated;
    });
  }, [fabricCanvas, currentPageIndex]);

  const handlePageSelect = useCallback((index: number) => {
    if (index === currentPageIndex || !fabricCanvas) return;

    // Save current page state
    saveCurrentPageState();

    // Switch to new page
    setCurrentPageIndex(index);

    // Load new page content
    const newPage = pages[index];
    if (newPage.designJson) {
      fabricCanvas.loadFromJSON(newPage.designJson).then(() => {
        fabricCanvas.requestRenderAll();
        updateObjectsList();
      });
    } else {
      // New empty page
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.requestRenderAll();
      updateObjectsList();
    }

    setSelectedObject(null);
  }, [currentPageIndex, fabricCanvas, pages, saveCurrentPageState, updateObjectsList]);

  const handleAddPage = useCallback(() => {
    // Save current page first
    saveCurrentPageState();

    const newPage: PageData = {
      id: crypto.randomUUID(),
      name: `Page ${pages.length + 1}`,
      designJson: null,
    };

    setPages(prev => [...prev, newPage]);

    // Switch to new page
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.requestRenderAll();
      updateObjectsList();
    }

    setCurrentPageIndex(pages.length);
    setSelectedObject(null);
    toast.success('New page added');
  }, [fabricCanvas, pages.length, saveCurrentPageState, updateObjectsList]);

  const handleDuplicatePage = useCallback((index: number) => {
    // Save current page first
    saveCurrentPageState();

    const sourcePage = pages[index];
    const duplicatedPage: PageData = {
      id: crypto.randomUUID(),
      name: `${sourcePage.name} (Copy)`,
      designJson: sourcePage.designJson ? JSON.parse(JSON.stringify(sourcePage.designJson)) : null,
    };

    const newPages = [...pages];
    newPages.splice(index + 1, 0, duplicatedPage);
    setPages(newPages);

    // Switch to duplicated page
    if (fabricCanvas && duplicatedPage.designJson) {
      fabricCanvas.loadFromJSON(duplicatedPage.designJson).then(() => {
        fabricCanvas.requestRenderAll();
        updateObjectsList();
      });
    }

    setCurrentPageIndex(index + 1);
    toast.success('Page duplicated');
  }, [fabricCanvas, pages, saveCurrentPageState, updateObjectsList]);

  const handleDeletePage = useCallback((index: number) => {
    if (pages.length <= 1) {
      toast.error('Cannot delete the only page');
      return;
    }

    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);

    // Adjust current page index if needed
    let newIndex = currentPageIndex;
    if (index <= currentPageIndex) {
      newIndex = Math.max(0, currentPageIndex - 1);
    }

    // Load the new current page
    const newCurrentPage = newPages[newIndex];
    if (fabricCanvas) {
      if (newCurrentPage.designJson) {
        fabricCanvas.loadFromJSON(newCurrentPage.designJson).then(() => {
          fabricCanvas.requestRenderAll();
          updateObjectsList();
        });
      } else {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        fabricCanvas.requestRenderAll();
        updateObjectsList();
      }
    }

    setCurrentPageIndex(newIndex);
    setSelectedObject(null);
    toast.success('Page deleted');
  }, [currentPageIndex, fabricCanvas, pages, updateObjectsList]);

  const handleRenamePage = useCallback((index: number, name: string) => {
    setPages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 's':
            e.preventDefault();
            saveMutation.mutate();
            break;
          case '=':
          case '+':
            e.preventDefault();
            handleZoom('in');
            break;
          case '-':
            e.preventDefault();
            handleZoom('out');
            break;
          case '0':
            e.preventDefault();
            setZoom(1);
            activeCanvas?.setZoom(1);
            activeCanvas?.requestRenderAll();
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            if (selectedObject) handleDelete();
            break;
          case 'v':
            setActiveTool('select');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'r':
            setActiveTool('rect');
            break;
          case 'c':
            setActiveTool('circle');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'h':
            handleSidebarToolChange('pan');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleDelete, handleZoom, selectedObject, saveMutation, activeCanvas]);

  // Prevent browser zoom on Ctrl+scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoom('in');
        } else {
          handleZoom('out');
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Also prevent at document level when in designer
    const docWheelHandler = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', docWheelHandler, { passive: false });

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('wheel', docWheelHandler);
    };
  }, [handleZoom]);

  // Pinch-to-zoom support for touch devices
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = zoom;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        if (initialDistance > 0) {
          const scale = currentDistance / initialDistance;
          const newZoom = Math.min(Math.max(initialZoom * scale, 0.25), 4);
          setZoom(newZoom);
          activeCanvas?.setZoom(newZoom);
          activeCanvas?.requestRenderAll();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, activeCanvas]);

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
      {/* New Header */}
      <DesignerHeader
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        widthMm={widthMm}
        heightMm={heightMm}
        category={category}
        hasBackSide={hasBackSide}
        activeSide={activeSide}
        onActiveSideChange={setActiveSide}
        onBack={onBack || (() => navigate('/dashboard/templates'))}
        onSave={() => saveMutation.mutate()}
        onExport={handleExport}
        onSettings={() => setSettingsOpen(true)}
        isSaving={saveMutation.isPending}
      />

      {/* Page Manager */}
      <DesignerPageManager
        pages={pages}
        currentPageIndex={currentPageIndex}
        onPageSelect={handlePageSelect}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preset Size</Label>
              <Select onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SIZES.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} {preset.width > 0 && `(${preset.width}×${preset.height}mm)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <Input type="number" value={widthMm} onChange={(e) => setWidthMm(parseFloat(e.target.value) || 85.6)} />
              </div>
              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <Input type="number" value={heightMm} onChange={(e) => setHeightMm(parseFloat(e.target.value) || 53.98)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ID Card">ID Card</SelectItem>
                  <SelectItem value="Certificate">Certificate</SelectItem>
                  <SelectItem value="Badge">Badge</SelectItem>
                  <SelectItem value="Visiting Card">Visiting Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Back Side</Label>
              <Switch checked={hasBackSide} onCheckedChange={setHasBackSide} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Make Public</Label>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Toolbar - shows when text object is selected */}
      <DesignerTextToolbar
        selectedObject={selectedObject}
        canvas={activeCanvas}
        onUpdate={updateObjectsList}
        customFonts={customFonts}
        onTextSettingsChange={(settings) => {
          // Update last text settings for new text elements
          lastTextSettingsRef.current = {
            ...lastTextSettingsRef.current,
            ...settings,
          };
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tool Sidebar */}
        <DesignerToolsSidebar
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          activeTool={activeTool === 'pan' ? 'pan' : activeTool === 'text' ? 'text' : 'select'}
          onToolChange={handleSidebarToolChange}
        />

        {/* Floating Panels */}
        {activeSidebarTab === 'elements' && (
          <DesignerElementsPanel onAddShape={addShape} onAddText={addText} onAddImage={addImage} onAddPlaceholder={addPlaceholder} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'layout' && (
          <DesignerLayoutPanel widthMm={widthMm} heightMm={heightMm} onWidthChange={setWidthMm} onHeightChange={setHeightMm} marginTop={marginTop} marginLeft={marginLeft} marginRight={marginRight} marginBottom={marginBottom} onMarginTopChange={setMarginTop} onMarginLeftChange={setMarginLeft} onMarginRightChange={setMarginRight} onMarginBottomChange={setMarginBottom} category={category} onCategoryChange={setCategory} snapToGrid={snapToGrid} onSnapToGridChange={setSnapToGrid} gridSize={gridSize} onGridSizeChange={setGridSize} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'background' && (
          <DesignerBackgroundPanel backgroundColor={backgroundColor} onBackgroundColorChange={handleBackgroundColorChange} onBackgroundGradientChange={handleBackgroundGradientChange} onRemoveBackgroundGradient={handleRemoveBackgroundGradient} onBackgroundImageChange={handleBackgroundImageChange} onRemoveBackgroundImage={handleRemoveBackgroundImage} hasBackgroundImage={hasBackgroundImage} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'images' && (
          <DesignerImagesPanel onAddImage={addImage} onAddPlaceholder={addPlaceholder} onAddCustomShape={handleAddCustomShape} onAddCustomFont={handleAddCustomFont} onUseCustomShape={addCustomShapeToCanvas} onChangePhotoShape={changePhotoPlaceholderShape} customShapes={customShapes} libraryShapes={libraryShapes.map((s: any) => ({ name: s.name, url: s.shape_url }))} customFonts={customFonts} selectedObject={selectedObject} onClose={() => setActiveSidebarTab(null)} />
        )}
        {activeSidebarTab === 'data' && (
          <DesignerDataPreviewPanel onPreviewData={handlePreviewData} onResetPreview={handleResetPreview} isPreviewMode={isPreviewMode} onTogglePreviewMode={handleTogglePreviewMode} onClose={() => setActiveSidebarTab(null)} detectedVariables={detectedVariables} />
        )}
        {activeSidebarTab === 'library' && (
          <DesignerLibraryPanel
            vendorId={vendorData?.id || null}
            onAddFont={(name, url) => {
              const loadFont = async () => {
                const fontFace = new FontFace(name, `url(${url})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                setCustomFonts(prev => [...prev, name]);
                toast.success(`Font "${name}" loaded`);
              };
              loadFont().catch(() => toast.error('Failed to load font'));
            }}
            onAddShape={(name, url) => { addCustomShapeToCanvas(url, name); }}
            onAddIcon={(name, url) => { addIconToCanvas(name, url); }}
            onClose={() => setActiveSidebarTab(null)}
          />
        )}
        {activeSidebarTab === 'batch' && (
          <DesignerBatchPDFPanel
            canvas={fabricCanvas}
            backCanvas={backFabricCanvas}
            templateName={templateName}
            hasBackSide={hasBackSide}
            widthMm={widthMm}
            heightMm={heightMm}
            designJson={fabricCanvas?.toObject()}
            backDesignJson={hasBackSide ? backFabricCanvas?.toObject() : undefined}
            category={category}
            onPreviewRecord={(record) => {
              setPreviewData(record);
              setIsPreviewMode(true);
              handlePreviewData(record);
            }}
            onClose={() => setActiveSidebarTab(null)}
          />
        )}

        {/* Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-muted/30 overflow-hidden">
          {/* Horizontal Ruler */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b">
            <div className="flex">
              <div className="w-6 h-6 bg-muted border-r" />
              <CanvasRuler orientation="horizontal" length={widthMm} zoom={zoom} />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Vertical Ruler */}
            <div className="flex-shrink-0 sticky left-0 z-10 bg-background border-r">
              <CanvasRuler orientation="vertical" length={heightMm} zoom={zoom} />
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="flex-1 flex items-center justify-center p-8 overflow-auto"
              style={{
                backgroundImage: showGrid ? `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)` : 'none',
                backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data.type === 'variable-field' && !data.isPhoto) {
                    // Add text at drop position
                    addText(data.placeholder, true);
                  }
                } catch (err) {
                  // Not our drag data, ignore
                }
              }}
            >
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-border">
                <div style={{ display: activeSide === 'front' ? 'block' : 'none' }}>
                  <canvas ref={canvasRef} />
                </div>
                {hasBackSide && (
                  <div style={{ display: activeSide === 'back' ? 'block' : 'none' }}>
                    <canvas ref={backCanvasRef} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Canvas Toolbar */}
          <DesignerCanvasToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            zoom={zoom}
            onZoomIn={() => handleZoom('in')}
            onZoomOut={() => handleZoom('out')}
            onZoomReset={() => { setZoom(1); if (activeCanvas) { activeCanvas.setZoom(1); activeCanvas.setWidth(widthMm * mmToPixels); activeCanvas.setHeight(heightMm * mmToPixels); activeCanvas.requestRenderAll(); } }}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            isPreviewMode={isPreviewMode}
            onTogglePreviewMode={() => { setIsPreviewMode(!isPreviewMode); if (!isPreviewMode) { setActiveSidebarTab('data'); } }}
          />
        </div>

        {/* Right Panel - Properties & Layers */}
        <div className="flex flex-col w-60 flex-shrink-0 border-l bg-card overflow-y-auto">
          <DesignerPropertiesPanel
            selectedObject={selectedObject}
            canvas={activeCanvas}
            onUpdate={() => {
              updateObjectsList();
              // Store last text settings when a text object is updated
              if (selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'i-text')) {
                lastTextSettingsRef.current = {
                  fontSize: selectedObject.fontSize || 14,
                  fontFamily: selectedObject.fontFamily || 'Arial',
                  fill: typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000',
                  textCase: selectedObject.data?.textCase || 'none',
                  autoFontSize: selectedObject.data?.autoFontSize || false,
                  wordWrap: selectedObject.splitByGrapheme !== false,
                };
              }
            }}
            customFonts={customFonts}
          />
          <DesignerLayersPanel
            objects={objects}
            selectedObject={selectedObject}
            onSelectObject={(obj) => { activeCanvas?.setActiveObject(obj); activeCanvas?.requestRenderAll(); setSelectedObject(obj); }}
            onToggleVisibility={toggleVisibility}
            onToggleLock={toggleLock}
            onDeleteObject={(obj) => { activeCanvas?.remove(obj); activeCanvas?.requestRenderAll(); }}
            onMoveUp={bringForward}
            onMoveDown={sendBackward}
          />
        </div>
      </div>

      {/* Context Menu */}
      <DesignerContextMenu x={contextMenu.x} y={contextMenu.y} visible={contextMenu.visible} selectedObject={selectedObject} onClose={closeContextMenu} onCopy={handleCopy} onPaste={handlePaste} onDuplicate={handleDuplicate} onDelete={handleDelete} onLock={() => selectedObject && toggleLock(selectedObject)} onToggleVisibility={() => selectedObject && toggleVisibility(selectedObject)} onBringForward={() => bringForward()} onSendBackward={() => sendBackward()} onBringToFront={bringToFront} onSendToBack={sendToBack} onFlipH={flipHorizontal} onFlipV={flipVertical} onAlignLeft={alignLeft} onAlignCenter={alignCenter} onAlignRight={alignRight} onAlignTop={alignTop} onAlignMiddle={alignMiddle} onAlignBottom={alignBottom} hasClipboard={!!clipboard} />
    </div>
  );
}

// Helper functions for creating polygon points
function createPolygonPoints(sides: number, radius: number) {
  const points = [];
  const angle = (2 * Math.PI) / sides;
  for (let i = 0; i < sides; i++) {
    points.push({
      x: radius + radius * Math.sin(i * angle),
      y: radius - radius * Math.cos(i * angle),
    });
  }
  return points;
}

function createStarPoints(points: number, outerRadius: number, innerRadius: number) {
  const starPoints = [];
  const angle = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push({
      x: outerRadius + r * Math.sin(i * angle),
      y: outerRadius - r * Math.cos(i * angle),
    });
  }
  return starPoints;
}

function createHeartPoints(size: number) {
  const points = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = size * (16 * Math.pow(Math.sin(t), 3)) / 16;
    const y = -size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
    points.push({ x: x + size, y: y + size });
  }
  return points;
}
