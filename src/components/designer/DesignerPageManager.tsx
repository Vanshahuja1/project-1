import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Copy, 
  Trash2, 
  MoreVertical,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageData {
  id: string;
  name: string;
  designJson: any;
}

interface DesignerPageManagerProps {
  pages: PageData[];
  currentPageIndex: number;
  onPageSelect: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRenamePage: (index: number, name: string) => void;
}

export function DesignerPageManager({
  pages,
  currentPageIndex,
  onPageSelect,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
}: DesignerPageManagerProps) {
  const canDeletePage = pages.length > 1;

  return (
    <div className="flex items-center gap-1 h-10 px-2 bg-muted/50 border-b">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Pages</span>
      </div>
      
      <ScrollArea className="flex-1 max-w-[400px]">
        <div className="flex items-center gap-1 py-1">
          {pages.map((page, index) => (
            <div key={page.id} className="flex items-center group">
              <Button
                variant={index === currentPageIndex ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-medium transition-all",
                  index === currentPageIndex && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => onPageSelect(index)}
              >
                {page.name}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -ml-1",
                      index === currentPageIndex && "opacity-100"
                    )}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => {
                    const newName = prompt('Enter page name:', page.name);
                    if (newName && newName.trim()) {
                      onRenamePage(index, newName.trim());
                    }
                  }}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicatePage(index)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeletePage(index)}
                    disabled={!canDeletePage}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onAddPage}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Page
      </Button>

      {/* Page navigation arrows */}
      <div className="flex items-center gap-0.5 ml-2 border-l pl-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={currentPageIndex === 0}
          onClick={() => onPageSelect(currentPageIndex - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
          {currentPageIndex + 1} / {pages.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={currentPageIndex === pages.length - 1}
          onClick={() => onPageSelect(currentPageIndex + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
