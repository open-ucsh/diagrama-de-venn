import { useEffect } from "react";

interface HistoryShortcutsOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function useHistoryShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
}: HistoryShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        isEditableElement(event.target) ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);

      if (wantsUndo && canUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (wantsRedo && canRedo) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);
}
