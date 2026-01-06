import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, Upload, Trash2, Type, Shapes, Globe, Lock,
  Loader2, Smile
} from 'lucide-react';

interface DesignerLibraryPanelProps {
  vendorId: string | null;
  onAddFont: (fontName: string, fontUrl: string) => void;
  onAddShape: (shapeName: string, shapeUrl: string) => void;
  onAddIcon?: (iconName: string, iconUrl: string) => void;
  onClose: () => void;
}

export function DesignerLibraryPanel({
  vendorId,
  onAddFont,
  onAddShape,
  onAddIcon,
  onClose,
}: DesignerLibraryPanelProps) {
  const queryClient = useQueryClient();
  const fontInputRef = useRef<HTMLInputElement>(null);
  const shapeInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [newFontName, setNewFontName] = useState('');
  const [newShapeName, setNewShapeName] = useState('');
  const [newIconName, setNewIconName] = useState('');
  const [isPublicFont, setIsPublicFont] = useState(false);
  const [isPublicShape, setIsPublicShape] = useState(false);
  const [isPublicIcon, setIsPublicIcon] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [uploadingShape, setUploadingShape] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Fetch fonts from library
  const { data: libraryFonts = [], isLoading: loadingFonts } = useQuery({
    queryKey: ['library-fonts', vendorId],
    queryFn: async () => {
      let query = supabase
        .from('library_fonts')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000,
  });

  // Fetch shapes from library
  const { data: libraryShapes = [], isLoading: loadingShapes } = useQuery({
    queryKey: ['library-shapes', vendorId],
    queryFn: async () => {
      let query = supabase
        .from('library_shapes')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000,
  });

  // Fetch icons from library
  const { data: libraryIcons = [], isLoading: loadingIcons } = useQuery({
    queryKey: ['library-icons', vendorId],
    queryFn: async () => {
      let query = supabase
        .from('library_icons')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000,
  });

  // Upload font mutation
  const uploadFontMutation = useMutation({
    mutationFn: async ({ file, name, isPublic }: { file: File; name: string; isPublic: boolean }) => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const fileName = `${vendorId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('library-fonts')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('library-fonts')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('library_fonts')
        .insert({
          vendor_id: vendorId,
          name,
          font_url: publicUrl,
          is_public: isPublic,
        });
      
      if (insertError) throw insertError;
      
      return { name, url: publicUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['library-fonts'] });
      toast.success(`Font "${data.name}" added to library`);
      setNewFontName('');
      setIsPublicFont(false);
    },
    onError: (error) => {
      toast.error('Failed to upload font');
      console.error(error);
    },
  });

  // Upload shape mutation
  const uploadShapeMutation = useMutation({
    mutationFn: async ({ file, name, isPublic }: { file: File; name: string; isPublic: boolean }) => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const fileName = `${vendorId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('library-shapes')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('library-shapes')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('library_shapes')
        .insert({
          vendor_id: vendorId,
          name,
          shape_url: publicUrl,
          is_public: isPublic,
        });
      
      if (insertError) throw insertError;
      
      return { name, url: publicUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['library-shapes'] });
      toast.success(`Shape "${data.name}" added to library`);
      setNewShapeName('');
      setIsPublicShape(false);
    },
    onError: (error) => {
      toast.error('Failed to upload shape');
      console.error(error);
    },
  });

  // Upload icon mutation
  const uploadIconMutation = useMutation({
    mutationFn: async ({ file, name, isPublic }: { file: File; name: string; isPublic: boolean }) => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const fileName = `${vendorId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('library-icons')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('library-icons')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('library_icons')
        .insert({
          vendor_id: vendorId,
          name,
          icon_url: publicUrl,
          is_public: isPublic,
        });
      
      if (insertError) throw insertError;
      
      return { name, url: publicUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['library-icons'] });
      toast.success(`Icon "${data.name}" added to library`);
      setNewIconName('');
      setIsPublicIcon(false);
    },
    onError: (error) => {
      toast.error('Failed to upload icon');
      console.error(error);
    },
  });

  // Delete mutations
  const deleteFontMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('library_fonts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-fonts'] });
      toast.success('Font removed from library');
    },
  });

  const deleteShapeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('library_shapes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-shapes'] });
      toast.success('Shape removed from library');
    },
  });

  const deleteIconMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('library_icons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-icons'] });
      toast.success('Icon removed from library');
    },
  });

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!newFontName.trim()) {
      toast.error('Please enter a font name');
      return;
    }
    
    setUploadingFont(true);
    uploadFontMutation.mutate(
      { file, name: newFontName.trim(), isPublic: isPublicFont },
      { onSettled: () => setUploadingFont(false) }
    );
    e.target.value = '';
  };

  const handleShapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!newShapeName.trim()) {
      toast.error('Please enter a shape name');
      return;
    }
    
    setUploadingShape(true);
    uploadShapeMutation.mutate(
      { file, name: newShapeName.trim(), isPublic: isPublicShape },
      { onSettled: () => setUploadingShape(false) }
    );
    e.target.value = '';
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!newIconName.trim()) {
      toast.error('Please enter an icon name');
      return;
    }
    
    setUploadingIcon(true);
    uploadIconMutation.mutate(
      { file, name: newIconName.trim(), isPublic: isPublicIcon },
      { onSettled: () => setUploadingIcon(false) }
    );
    e.target.value = '';
  };

  const myFonts = libraryFonts.filter((f: any) => f.vendor_id === vendorId);
  const publicFonts = libraryFonts.filter((f: any) => f.is_public && f.vendor_id !== vendorId);
  const myShapes = libraryShapes.filter((s: any) => s.vendor_id === vendorId);
  const publicShapes = libraryShapes.filter((s: any) => s.is_public && s.vendor_id !== vendorId);
  const myIcons = libraryIcons.filter((i: any) => i.vendor_id === vendorId);
  const publicIcons = libraryIcons.filter((i: any) => i.is_public && i.vendor_id !== vendorId);

  return (
    <div className="w-72 bg-card border-r shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <h3 className="font-semibold text-sm">Library</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="fonts" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 mx-3 mt-2" style={{ width: 'calc(100% - 24px)' }}>
          <TabsTrigger value="fonts" className="text-xs gap-1">
            <Type className="h-3 w-3" />
            Fonts
          </TabsTrigger>
          <TabsTrigger value="shapes" className="text-xs gap-1">
            <Shapes className="h-3 w-3" />
            Shapes
          </TabsTrigger>
          <TabsTrigger value="icons" className="text-xs gap-1">
            <Smile className="h-3 w-3" />
            Icons
          </TabsTrigger>
        </TabsList>

        {/* Fonts Tab */}
        <TabsContent value="fonts" className="flex-1 flex flex-col m-0 min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <Card className="p-3 space-y-2">
                <Label className="text-xs font-medium">Add New Font</Label>
                <Input
                  placeholder="Font name"
                  value={newFontName}
                  onChange={(e) => setNewFontName(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Make public</Label>
                  <Switch
                    checked={isPublicFont}
                    onCheckedChange={setIsPublicFont}
                    className="scale-75"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={uploadingFont || !newFontName.trim()}
                  onClick={() => fontInputRef.current?.click()}
                >
                  {uploadingFont ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Upload Font File
                </Button>
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  onChange={handleFontUpload}
                />
              </Card>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">My Fonts</Label>
                {loadingFonts ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">Loading...</div>
                ) : myFonts.length === 0 ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">No fonts yet</div>
                ) : (
                  myFonts.map((font: any) => (
                    <div
                      key={font.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{font.name}</span>
                        {font.is_public ? (
                          <Globe className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => onAddFont(font.name, font.font_url)}
                        >
                          <Type className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => deleteFontMutation.mutate(font.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {publicFonts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Public Fonts
                  </Label>
                  {publicFonts.map((font: any) => (
                    <div
                      key={font.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs group"
                    >
                      <span className="font-medium">{font.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => onAddFont(font.name, font.font_url)}
                      >
                        <Type className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Shapes Tab */}
        <TabsContent value="shapes" className="flex-1 flex flex-col m-0 min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <Card className="p-3 space-y-2">
                <Label className="text-xs font-medium">Add New Shape</Label>
                <Input
                  placeholder="Shape name"
                  value={newShapeName}
                  onChange={(e) => setNewShapeName(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Make public</Label>
                  <Switch
                    checked={isPublicShape}
                    onCheckedChange={setIsPublicShape}
                    className="scale-75"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={uploadingShape || !newShapeName.trim()}
                  onClick={() => shapeInputRef.current?.click()}
                >
                  {uploadingShape ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Upload Shape (SVG/PNG)
                </Button>
                <input
                  ref={shapeInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleShapeUpload}
                />
              </Card>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">My Shapes</Label>
                {loadingShapes ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">Loading...</div>
                ) : myShapes.length === 0 ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">No shapes yet</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {myShapes.map((shape: any) => (
                      <div
                        key={shape.id}
                        className="relative group aspect-square bg-muted rounded flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary p-1"
                        onClick={() => onAddShape(shape.name, shape.shape_url)}
                      >
                        <img
                          src={shape.shape_url}
                          alt={shape.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ filter: 'none' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteShapeMutation.mutate(shape.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {shape.is_public && (
                          <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] px-1 py-0">
                            <Globe className="h-2 w-2" />
                          </Badge>
                        )}
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] p-0.5 truncate text-center">
                          {shape.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {publicShapes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Public Shapes
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {publicShapes.map((shape: any) => (
                      <div
                        key={shape.id}
                        className="relative aspect-square bg-muted rounded flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary p-1"
                        onClick={() => onAddShape(shape.name, shape.shape_url)}
                      >
                        <img
                          src={shape.shape_url}
                          alt={shape.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ filter: 'none' }}
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] p-0.5 truncate text-center">
                          {shape.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Icons Tab */}
        <TabsContent value="icons" className="flex-1 flex flex-col m-0 min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <Card className="p-3 space-y-2">
                <Label className="text-xs font-medium">Add New Icon</Label>
                <Input
                  placeholder="Icon name"
                  value={newIconName}
                  onChange={(e) => setNewIconName(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Make public</Label>
                  <Switch
                    checked={isPublicIcon}
                    onCheckedChange={setIsPublicIcon}
                    className="scale-75"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={uploadingIcon || !newIconName.trim()}
                  onClick={() => iconInputRef.current?.click()}
                >
                  {uploadingIcon ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Upload Icon (SVG/PNG)
                </Button>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.ico"
                  className="hidden"
                  onChange={handleIconUpload}
                />
              </Card>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">My Icons</Label>
                {loadingIcons ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">Loading...</div>
                ) : myIcons.length === 0 ? (
                  <div className="text-xs text-center py-2 text-muted-foreground">No icons yet</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {myIcons.map((icon: any) => (
                      <div
                        key={icon.id}
                        className="relative group aspect-square bg-muted rounded flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary p-1"
                        onClick={() => onAddIcon?.(icon.name, icon.icon_url)}
                      >
                        <img
                          src={icon.icon_url}
                          alt={icon.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ filter: 'none' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteIconMutation.mutate(icon.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {icon.is_public && (
                          <Badge variant="secondary" className="absolute top-0.5 right-0.5 text-[6px] px-0.5 py-0">
                            <Globe className="h-2 w-2" />
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {publicIcons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Public Icons
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {publicIcons.map((icon: any) => (
                      <div
                        key={icon.id}
                        className="aspect-square bg-muted rounded flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary p-1"
                        onClick={() => onAddIcon?.(icon.name, icon.icon_url)}
                      >
                        <img
                          src={icon.icon_url}
                          alt={icon.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ filter: 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
