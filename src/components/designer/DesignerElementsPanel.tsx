import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Type, Square, Circle, Triangle, Star, Minus, Image, QrCode, Barcode,
  User, Phone, Mail, Calendar, MapPin, CreditCard,
  Hash, Droplet, GraduationCap, Users, ArrowRight, Hexagon, Pentagon, X, Heart, Octagon
} from 'lucide-react';

export type PhotoShape = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'hexagon' | 'star' | 'heart' | 'octagon' | 'pentagon';

interface DesignerElementsPanelProps {
  onAddShape: (type: string) => void;
  onAddText: (text: string, isVariable?: boolean) => void;
  onAddImage: (file: File) => void;
  onAddPlaceholder: (type: 'photo' | 'barcode' | 'qrcode', shape?: PhotoShape) => void;
  onClose?: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const VARIABLE_FIELDS = [
  // Student Info
  { id: 'firstName', label: 'First Name', icon: User, placeholder: '{{firstName}}' },
  { id: 'lastName', label: 'Last Name', icon: User, placeholder: '{{lastName}}' },
  { id: 'name', label: 'Full Name', icon: User, placeholder: '{{name}}' },
  { id: 'photo', label: 'Photo', icon: Image, placeholder: '{{photo}}', isPlaceholder: true, isPhoto: true },
  { id: 'profilePic', label: 'Profile Pic', icon: Image, placeholder: '{{profilePic}}', isPlaceholder: true, isPhoto: true },
  
  // Academic Info
  { id: 'className', label: 'Class', icon: GraduationCap, placeholder: '{{className}}' },
  { id: 'sec', label: 'Section', icon: GraduationCap, placeholder: '{{sec}}' },
  { id: 'admNo', label: 'Admission No', icon: Hash, placeholder: '{{admNo}}' },
  { id: 'roll_no', label: 'Roll No', icon: Hash, placeholder: '{{roll_no}}' },
  { id: 'schoolCode', label: 'School Code', icon: CreditCard, placeholder: '{{schoolCode}}' },
  { id: 'session', label: 'Session', icon: Calendar, placeholder: '{{session}}' },
  
  // Personal Info
  { id: 'dob', label: 'Date of Birth', icon: Calendar, placeholder: '{{dob}}' },
  { id: 'blood_group', label: 'Blood Group', icon: Droplet, placeholder: '{{blood_group}}' },
  { id: 'gender', label: 'Gender', icon: User, placeholder: '{{gender}}' },
  { id: 'address', label: 'Address', icon: MapPin, placeholder: '{{address}}' },
  
  // Parent Info
  { id: 'fatherName', label: 'Father Name', icon: Users, placeholder: '{{fatherName}}' },
  { id: 'motherName', label: 'Mother Name', icon: Users, placeholder: '{{motherName}}' },
  { id: 'fatherMobNo', label: 'Father Mobile', icon: Phone, placeholder: '{{fatherMobNo}}' },
  { id: 'motherMobNo', label: 'Mother Mobile', icon: Phone, placeholder: '{{motherMobNo}}' },
  
  // Contact
  { id: 'phone', label: 'Phone', icon: Phone, placeholder: '{{phone}}' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: '{{email}}' },
  
  // Codes
  { id: 'id_number', label: 'ID Number', icon: CreditCard, placeholder: '{{id_number}}' },
  { id: 'rfid', label: 'RFID', icon: CreditCard, placeholder: '{{rfid}}' },
  { id: 'barcode', label: 'Barcode', icon: Barcode, placeholder: '{{barcode}}', isPlaceholder: true },
  { id: 'qr_code', label: 'QR Code', icon: QrCode, placeholder: '{{qr_code}}', isPlaceholder: true },
];

const SHAPES = [
  { type: 'rect', icon: Square, label: 'Rectangle' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'star', icon: Star, label: 'Star' },
  { type: 'polygon', icon: Hexagon, label: 'Hexagon' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

const PHOTO_SHAPES: { id: PhotoShape; name: string; icon: React.ReactNode }[] = [
  { id: 'rect', name: 'Rectangle', icon: <Square className="h-4 w-4" /> },
  { id: 'rounded-rect', name: 'Rounded', icon: <div className="h-4 w-4 border-2 border-current rounded-md" /> },
  { id: 'circle', name: 'Circle', icon: <Circle className="h-4 w-4" /> },
  { id: 'ellipse', name: 'Ellipse', icon: <div className="h-3 w-5 border-2 border-current rounded-full" /> },
  { id: 'hexagon', name: 'Hexagon', icon: <Hexagon className="h-4 w-4" /> },
  { id: 'star', name: 'Star', icon: <Star className="h-4 w-4" /> },
  { id: 'heart', name: 'Heart', icon: <Heart className="h-4 w-4" /> },
  { id: 'octagon', name: 'Octagon', icon: <Octagon className="h-4 w-4" /> },
  { id: 'pentagon', name: 'Pentagon', icon: <Pentagon className="h-4 w-4" /> },
];

export function DesignerElementsPanel({
  onAddShape,
  onAddText,
  onAddImage,
  onAddPlaceholder,
  onClose,
  canvasRef,
}: DesignerElementsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPopoverOpen, setPhotoPopoverOpen] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddImage(file);
      e.target.value = '';
    }
  };

  const handleAddPhotoWithShape = (shape: PhotoShape) => {
    onAddPlaceholder('photo', shape);
    setPhotoPopoverOpen(null);
  };

  const handleVariableClick = (field: typeof VARIABLE_FIELDS[0]) => {
    if (field.id === 'barcode') {
      onAddPlaceholder('barcode');
    } else if (field.id === 'qr_code') {
      onAddPlaceholder('qrcode');
    } else if (!field.isPhoto) {
      onAddText(field.placeholder, true);
    }
    // Photo variables are handled by the popover
  };

  // Handle drag start for variable fields
  const handleDragStart = (e: React.DragEvent, field: typeof VARIABLE_FIELDS[0]) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'variable-field',
      fieldId: field.id,
      placeholder: field.placeholder,
      isPhoto: field.isPhoto,
      isPlaceholder: field.isPlaceholder,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-72 bg-card border-r shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-base">Elements</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-4 space-y-4">
          <Tabs defaultValue="shapes" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="shapes" className="text-xs">Shapes</TabsTrigger>
              <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            </TabsList>

            {/* Shapes Tab */}
            <TabsContent value="shapes" className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((shape) => (
                  <Button
                    key={shape.type}
                    variant="outline"
                    className="h-16 flex-col gap-1 p-2"
                    onClick={() => onAddShape(shape.type)}
                  >
                    <shape.icon className="h-5 w-5" />
                    <span className="text-[10px]">{shape.label}</span>
                  </Button>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Shapes</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('rounded-rect')}
                    title="Rounded Rectangle"
                  >
                    <Square className="h-4 w-4 rounded" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('ellipse')}
                    title="Ellipse"
                  >
                    <Circle className="h-4 w-4 scale-x-125" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('pentagon')}
                    title="Pentagon"
                  >
                    <Pentagon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('diamond')}
                    title="Diamond"
                  >
                    <Square className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddText('Heading', false)}
                >
                  <Type className="h-5 w-5 mr-2" />
                  <span className="font-bold">Add Heading</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddText('Subheading', false)}
                >
                  <Type className="h-4 w-4 mr-2" />
                  <span className="font-medium text-sm">Add Subheading</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddText('Body text', false)}
                >
                  <Type className="h-3 w-3 mr-2" />
                  <span className="text-sm">Add Body Text</span>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Variable Fields</Label>
                <div className="space-y-1">
                  {VARIABLE_FIELDS.map((field) => (
                    field.isPhoto ? (
                      <Popover 
                        key={field.id} 
                        open={photoPopoverOpen === field.id}
                        onOpenChange={(open) => setPhotoPopoverOpen(open ? field.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-8 text-xs"
                          >
                            <field.icon className="h-3.5 w-3.5 mr-2" />
                            {field.label}
                            <Badge variant="secondary" className="ml-auto text-[10px] h-4">
                              Shape
                            </Badge>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="right" align="start">
                          <div className="space-y-3">
                            <p className="text-xs font-medium">Select Photo Shape</p>
                            <div className="grid grid-cols-3 gap-2">
                              {PHOTO_SHAPES.map((shape) => (
                                <Button
                                  key={shape.id}
                                  variant="outline"
                                  className="h-12 flex-col gap-1 p-1"
                                  onClick={() => handleAddPhotoWithShape(shape.id)}
                                >
                                  {shape.icon}
                                  <span className="text-[9px]">{shape.name}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Button
                        key={field.id}
                        variant="ghost"
                        className="w-full justify-start h-8 text-xs cursor-grab active:cursor-grabbing"
                        onClick={() => handleVariableClick(field)}
                        draggable={!field.isPlaceholder}
                        onDragStart={(e) => handleDragStart(e, field)}
                      >
                        <field.icon className="h-3.5 w-3.5 mr-2" />
                        {field.label}
                        {field.isPlaceholder && (
                          <Badge variant="secondary" className="ml-auto text-[10px] h-4">
                            Special
                          </Badge>
                        )}
                      </Button>
                    )
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-6 w-6" />
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

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Placeholders</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddPlaceholder('photo')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Photo Placeholder
                </Button>
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
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
