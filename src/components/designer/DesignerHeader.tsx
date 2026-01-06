import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  ChevronLeft, 
  Pencil, 
  FolderOpen, 
  Download, 
  Save, 
  FileImage, 
  FileJson,
  Settings,
  Plus
} from 'lucide-react';
import { useState } from 'react';

interface DesignerHeaderProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  widthMm: number;
  heightMm: number;
  category: string;
  hasBackSide: boolean;
  activeSide: 'front' | 'back';
  onActiveSideChange: (side: 'front' | 'back') => void;
  onBack: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
  onSettings: () => void;
  onNew?: () => void;
  isSaving?: boolean;
}

export function DesignerHeader({
  templateName,
  onTemplateNameChange,
  widthMm,
  heightMm,
  category,
  hasBackSide,
  activeSide,
  onActiveSideChange,
  onBack,
  onSave,
  onExport,
  onExportPNG,
  onExportJSON,
  onSettings,
  onNew,
  isSaving = false,
}: DesignerHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <div className="flex items-center h-12 px-3 bg-card border-b gap-2">
      {/* Left section - Back + Logo */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm text-primary hidden sm:inline">
          DESIGN STUDIO
        </span>
      </div>

      {/* Center section - Document name */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {isEditingName ? (
          <Input
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            className="max-w-[200px] h-7 text-sm text-center"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-1 text-sm font-medium hover:bg-muted px-2 py-1 rounded transition-colors"
          >
            <span>{templateName}</span>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        {/* Front/Back tabs */}
        {hasBackSide && (
          <Tabs value={activeSide} onValueChange={(v) => onActiveSideChange(v as 'front' | 'back')}>
            <TabsList className="h-7">
              <TabsTrigger value="front" className="text-xs h-6 px-2">Front</TabsTrigger>
              <TabsTrigger value="back" className="text-xs h-6 px-2">Back</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Right section - Dimensions + Actions */}
      <div className="flex items-center gap-2">
        {/* Dimensions badge */}
        <div className="hidden md:flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          <span>{widthMm}×{heightMm}mm</span>
          <span className="mx-1">•</span>
          <span>{category}</span>
        </div>

        {/* New button */}
        {onNew && (
          <Button variant="outline" size="sm" className="h-8" onClick={onNew}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        )}

        {/* Settings */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </Button>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPNG || onExport}>
              <FileImage className="h-4 w-4 mr-2" />
              Export as PNG
            </DropdownMenuItem>
            {onExportJSON && (
              <DropdownMenuItem onClick={onExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save button */}
        <Button size="sm" className="h-8" onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
