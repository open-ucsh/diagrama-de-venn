import { SHORTCUTS } from "@/components/editor/shortcuts/shortcuts";
import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";

interface HistoryShortcutsOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useHistoryShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
}: HistoryShortcutsOptions): void {
  useKeyboardShortcut({
    ...SHORTCUTS.undo,
    enabled: canUndo,
    onTrigger: undo,
  });

  useKeyboardShortcut({
    ...SHORTCUTS.redo,
    enabled: canRedo,
    onTrigger: redo,
  });

  useKeyboardShortcut({
    ...SHORTCUTS.redoAlternative,
    enabled: canRedo,
    onTrigger: redo,
  });
}
