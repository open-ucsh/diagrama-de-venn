import { type RefObject, useEffect } from "react";

interface DismissableLayerOptions {
  containerRef: RefObject<HTMLElement | null>;
  isOpen: () => boolean;
  onDismiss: (restoreFocus: boolean) => void;
  dismissOnFocusOutside?: boolean;
}

export function useDismissableLayer({
  containerRef,
  isOpen,
  onDismiss,
  dismissOnFocusOutside = false,
}: DismissableLayerOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isOpen() || event.key !== "Escape" || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      onDismiss(true);
    }

    function handleOutside(event: Event): void {
      const container = containerRef.current;

      if (
        isOpen() &&
        container &&
        event.target instanceof Node &&
        !container.contains(event.target)
      ) {
        onDismiss(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handleOutside);

    if (dismissOnFocusOutside) {
      window.addEventListener("focusin", handleOutside);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("focusin", handleOutside);
    };
  }, [containerRef, isOpen, onDismiss, dismissOnFocusOutside]);
}
