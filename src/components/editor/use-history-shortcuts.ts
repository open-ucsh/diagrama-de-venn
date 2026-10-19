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
    code: "KeyZ",
    enabled: canUndo,
    onTrigger: undo,
  });

  useKeyboardShortcut({
    code: "KeyZ",
    shift: true,
    enabled: canRedo,
    onTrigger: redo,
  });

  useKeyboardShortcut({
    code: "KeyY",
    enabled: canRedo,
    onTrigger: redo,
  });
}
