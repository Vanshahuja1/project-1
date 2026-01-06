import { useEffect, useRef, useState } from 'react';
import {
  Copy, Clipboard, Trash2, Lock, Unlock, Eye, EyeOff,
  ChevronUp, ChevronDown, FlipHorizontal, FlipVertical,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical,
  AlignCenterVertical, AlignEndVertical, Layers, CopyPlus
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ContextMenuAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface DesignerContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  selectedObject: any;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
  onToggleVisibility: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  hasClipboard: boolean;
}

export function DesignerContextMenu({
  x,
  y,
  visible,
  selectedObject,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onLock,
  onToggleVisibility,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onFlipH,
  onFlipV,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  hasClipboard,
}: DesignerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      // Adjust if menu goes off screen
      if (x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }
      if (y + menuRect.height > viewportHeight) {
        newY = viewportHeight - menuRect.height - 10;
      }

      setPosition({ x: newX, y: newY });
    }
  }, [visible, x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const isLocked = selectedObject?.lockMovementX && selectedObject?.lockMovementY;
  const isVisible = selectedObject?.visible !== false;

  const MenuItem = ({ label, icon, onClick, disabled }: ContextMenuAction) => (
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={() => {
        if (!disabled) {
          onClick();
          onClose();
        }
      }}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-popover border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      {selectedObject ? (
        <>
          <MenuItem
            label="Copy"
            icon={<Copy className="h-4 w-4" />}
            onClick={onCopy}
          />
          <MenuItem
            label="Paste"
            icon={<Clipboard className="h-4 w-4" />}
            onClick={onPaste}
            disabled={!hasClipboard}
          />
          <MenuItem
            label="Duplicate"
            icon={<CopyPlus className="h-4 w-4" />}
            onClick={onDuplicate}
          />
          <MenuItem
            label="Delete"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={onDelete}
          />

          <Separator className="my-1" />

          <MenuItem
            label={isLocked ? 'Unlock' : 'Lock'}
            icon={isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            onClick={onLock}
          />
          <MenuItem
            label={isVisible ? 'Hide' : 'Show'}
            icon={isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            onClick={onToggleVisibility}
          />

          <Separator className="my-1" />

          <div className="px-3 py-1 text-xs text-muted-foreground">Arrange</div>
          <MenuItem
            label="Bring Forward"
            icon={<ChevronUp className="h-4 w-4" />}
            onClick={onBringForward}
          />
          <MenuItem
            label="Send Backward"
            icon={<ChevronDown className="h-4 w-4" />}
            onClick={onSendBackward}
          />
          <MenuItem
            label="Bring to Front"
            icon={<Layers className="h-4 w-4" />}
            onClick={onBringToFront}
          />
          <MenuItem
            label="Send to Back"
            icon={<Layers className="h-4 w-4 rotate-180" />}
            onClick={onSendToBack}
          />

          <Separator className="my-1" />

          <div className="px-3 py-1 text-xs text-muted-foreground">Transform</div>
          <MenuItem
            label="Flip Horizontal"
            icon={<FlipHorizontal className="h-4 w-4" />}
            onClick={onFlipH}
          />
          <MenuItem
            label="Flip Vertical"
            icon={<FlipVertical className="h-4 w-4" />}
            onClick={onFlipV}
          />

          <Separator className="my-1" />

          <div className="px-3 py-1 text-xs text-muted-foreground">Align</div>
          <div className="flex gap-0.5 px-2 py-1">
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignLeft(); onClose(); }}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignCenter(); onClose(); }}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignRight(); onClose(); }}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignTop(); onClose(); }}
              title="Align Top"
            >
              <AlignStartVertical className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignMiddle(); onClose(); }}
              title="Align Middle"
            >
              <AlignCenterVertical className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => { onAlignBottom(); onClose(); }}
              title="Align Bottom"
            >
              <AlignEndVertical className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <MenuItem
            label="Paste"
            icon={<Clipboard className="h-4 w-4" />}
            onClick={onPaste}
            disabled={!hasClipboard}
          />
        </>
      )}
    </div>
  );
}
