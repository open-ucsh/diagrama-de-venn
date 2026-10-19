import { useEffect } from "react";

interface KeyboardShortcutOptions {
  code: string;
  shift?: boolean;
  enabled?: boolean;
  onTrigger: () => void;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest("input, textarea, select") !== null ||
    target.closest('[role="textbox"]') !== null ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

export function useKeyboardShortcut({
  code,
  shift = false,
  enabled = true,
  onTrigger,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.shiftKey !== shift ||
        event.code !== code ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      onTrigger();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [code, shift, enabled, onTrigger]);
}
