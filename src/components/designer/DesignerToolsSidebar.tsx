import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2, 
  Hand,
  Type, 
  Shapes, 
  Image, 
  LayoutGrid,
  Paintbrush,
  Database,
  Library,
  Sparkles,
  FileText
} from 'lucide-react';

export type SidebarTab = 'elements' | 'background' | 'images' | 'layout' | 'data' | 'library' | 'batch';
export type ToolType = 'select' | 'pan' | 'text';

interface DesignerToolsSidebarProps {
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab | null) => void;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const TOOL_ITEMS = [
  { id: 'select' as ToolType, icon: MousePointer2, label: 'Select (V)' },
  { id: 'pan' as ToolType, icon: Hand, label: 'Hand/Pan (H)' },
  { id: 'text' as ToolType, icon: Type, label: 'Text (T) - Click canvas to add' },
];

const PANEL_ITEMS = [
  { id: 'elements' as SidebarTab, icon: Shapes, label: 'Shapes & Elements' },
  { id: 'images' as SidebarTab, icon: Image, label: 'Images' },
  { id: 'background' as SidebarTab, icon: Paintbrush, label: 'Background' },
  { id: 'layout' as SidebarTab, icon: LayoutGrid, label: 'Layout & Size' },
  { id: 'data' as SidebarTab, icon: Database, label: 'Data Fields' },
  { id: 'library' as SidebarTab, icon: Library, label: 'Library' },
  { id: 'batch' as SidebarTab, icon: FileText, label: 'Batch PDF Generation' },
];

export function DesignerToolsSidebar({ 
  activeTab, 
  onTabChange, 
  activeTool, 
  onToolChange 
}: DesignerToolsSidebarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center py-2 px-1 bg-card border-r w-12 gap-1">
        {/* Drawing Tools */}
        {TOOL_ITEMS.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === item.id ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => onToolChange(item.id)}
              >
                <item.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator className="my-1 w-8" />

        {/* Panel toggles */}
        {PANEL_ITEMS.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => onTabChange(activeTab === item.id ? null : item.id)}
              >
                <item.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-1" />

        {/* AI/Magic tool at bottom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-primary"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            AI Tools
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
