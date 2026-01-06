import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: 'General', items: [
    { keys: ['Ctrl', 'S'], description: 'Save template' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
  ]},
  { category: 'Selection', items: [
    { keys: ['V'], description: 'Select tool' },
    { keys: ['Ctrl', 'C'], description: 'Copy selected' },
    { keys: ['Ctrl', 'V'], description: 'Paste' },
    { keys: ['Delete'], description: 'Delete selected' },
    { keys: ['Backspace'], description: 'Delete selected' },
  ]},
  { category: 'Tools', items: [
    { keys: ['T'], description: 'Text tool' },
    { keys: ['R'], description: 'Rectangle tool' },
    { keys: ['C'], description: 'Circle tool' },
    { keys: ['L'], description: 'Line tool' },
  ]},
  { category: 'View', items: [
    { keys: ['Ctrl', '+'], description: 'Zoom in' },
    { keys: ['Ctrl', '-'], description: 'Zoom out' },
    { keys: ['Ctrl', '0'], description: 'Reset zoom to 100%' },
  ]},
];

export function KeyboardShortcutsPanel() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                {section.category}
              </h4>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
