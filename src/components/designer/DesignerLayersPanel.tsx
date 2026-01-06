import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown,
  Type, Square, Circle, Image, Triangle, Star, Minus
} from 'lucide-react';

interface DesignerLayersPanelProps {
  objects: any[];
  selectedObject: any;
  onSelectObject: (obj: any) => void;
  onToggleVisibility: (obj: any) => void;
  onToggleLock: (obj: any) => void;
  onDeleteObject: (obj: any) => void;
  onMoveUp: (obj: any) => void;
  onMoveDown: (obj: any) => void;
}

export function DesignerLayersPanel({
  objects,
  selectedObject,
  onSelectObject,
  onToggleVisibility,
  onToggleLock,
  onDeleteObject,
  onMoveUp,
  onMoveDown,
}: DesignerLayersPanelProps) {
  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'textbox':
      case 'i-text':
        return Type;
      case 'rect':
        return Square;
      case 'circle':
        return Circle;
      case 'triangle':
        return Triangle;
      case 'polygon':
        return Star;
      case 'line':
        return Minus;
      case 'image':
        return Image;
      default:
        return Square;
    }
  };

  const getObjectLabel = (obj: any, index: number) => {
    const type = obj.type || 'object';
    if (obj.text) {
      const text = obj.text.substring(0, 15);
      return text.length < obj.text.length ? `${text}...` : text;
    }
    if (obj.data?.field) {
      return `{{${obj.data.field}}}`;
    }
    return `${type} ${index + 1}`;
  };

  // Reverse to show top layer first
  const reversedObjects = [...objects].reverse();

  return (
    <Card className="h-48 rounded-none border-t">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium flex items-center justify-between">
          Layers
          <Badge variant="secondary" className="text-xs">
            {objects.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100%-40px)]">
        <CardContent className="p-1 space-y-0.5">
          {reversedObjects.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No objects on canvas
            </div>
          ) : (
            reversedObjects.map((obj, idx) => {
              const originalIndex = objects.length - 1 - idx;
              const Icon = getObjectIcon(obj.type);
              const isSelected = selectedObject === obj;
              const isVisible = obj.visible !== false;
              const isLocked = obj.lockMovementX && obj.lockMovementY;

              // Use a stable key based on object properties
              const stableKey = obj.id || `${obj.type}-${originalIndex}-${obj.left}-${obj.top}`;

              return (
                <div
                  key={stableKey}
                  className={`flex items-center gap-1 p-1.5 rounded cursor-pointer hover:bg-muted/50 group ${isSelected ? 'bg-primary/10 border border-primary/30' : ''
                    }`}
                  onClick={() => onSelectObject(obj)}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs flex-1 truncate ${!isVisible ? 'opacity-50' : ''}`}>
                    {getObjectLabel(obj, originalIndex)}
                  </span>

                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      title="Move up (bring forward)"
                      disabled={idx === 0} // Already at top
                      onClick={(e) => {
                        e.stopPropagation();
                        // In the reversed list, moving up visually means bringing forward
                        onMoveUp(obj);
                      }}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      title="Move down (send backward)"
                      disabled={idx === reversedObjects.length - 1} // Already at bottom
                      onClick={(e) => {
                        e.stopPropagation();
                        // In the reversed list, moving down visually means sending backward
                        onMoveDown(obj);
                      }}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj); }}
                    >
                      {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); onToggleLock(obj); }}
                    >
                      {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDeleteObject(obj); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
