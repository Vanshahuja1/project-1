import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Shapes, Image, LayoutGrid, Paintbrush, Database, Library } from 'lucide-react';

export type SidebarTab = 'elements' | 'background' | 'images' | 'layout' | 'data' | 'library';

interface DesignerSidebarProps {
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab | null) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'elements' as SidebarTab, icon: Shapes, label: 'Elements' },
  { id: 'background' as SidebarTab, icon: Paintbrush, label: 'Background' },
  { id: 'images' as SidebarTab, icon: Image, label: 'Images' },
  { id: 'layout' as SidebarTab, icon: LayoutGrid, label: 'Layout' },
  { id: 'data' as SidebarTab, icon: Database, label: 'Data' },
  { id: 'library' as SidebarTab, icon: Library, label: 'Library' },
];

export function DesignerSidebar({ activeTab, onTabChange }: DesignerSidebarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center py-2 px-1 bg-card border-r w-14 gap-0.5">
        {SIDEBAR_ITEMS.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                size="sm"
                className="w-11 h-11 flex flex-col gap-0 p-1"
                onClick={() => onTabChange(activeTab === item.id ? null : item.id)}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[8px] leading-tight">{item.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
