import { useEffect } from "react";

import { FileText, Redo2, Undo2 } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function EditorHeader() {
  const diagramName = useVennStore((state) => state.diagram.metadata.name);

  const canUndo = useVennStore((state) => state.past.length > 0);

  const canRedo = useVennStore((state) => state.future.length > 0);

  const undo = useVennStore((state) => state.undo);

  const redo = useVennStore((state) => state.redo);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableElement(event.target)) {
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey;

      if (!hasModifier) {
        return;
      }

      const key = event.key.toLowerCase();

      const wantsUndo = key === "z" && !event.shiftKey;

      const wantsRedo = (key === "z" && event.shiftKey) || key === "y";

      if (wantsUndo && canUndo) {
        event.preventDefault();
        undo();
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
  }, [canRedo, canUndo, redo, undo]);

  return (
    <header className="shrink-0 border-b-4 border-accent bg-brand-primary px-5 py-4 text-white sm:px-8">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-5">
        <img
          alt="Universidad Católica Silva Henríquez"
          className="h-12 w-auto object-contain"
          src="/logo.png"
        />

        <div className="h-10 w-px bg-white/20" />

        <div className="flex min-w-0 items-center gap-3">
          <FileText aria-hidden="true" className="size-5 shrink-0 text-white/80" />

          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight sm:text-lg">
              Diagrama de Venn
            </p>

            <p className="mt-0.5 truncate text-sm text-white/70">{diagramName}</p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            aria-label="Deshacer"
            className="grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={!canUndo}
            onClick={undo}
            title="Deshacer (Ctrl + Z)"
            type="button"
          >
            <Undo2 aria-hidden="true" className="size-5" />
          </button>

          <button
            aria-label="Rehacer"
            className="grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={!canRedo}
            onClick={redo}
            title="Rehacer (Ctrl + Shift + Z)"
            type="button"
          >
            <Redo2 aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
