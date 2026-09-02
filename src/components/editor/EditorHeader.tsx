import { useEffect, useState } from "react";

import { FileText, Redo2, Undo2 } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

import { ExportMenu } from "./ExportMenu";

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

  const renameDiagram = useVennStore((state) => state.renameDiagram);

  const canUndo = useVennStore((state) => state.past.length > 0);

  const canRedo = useVennStore((state) => state.future.length > 0);

  const undo = useVennStore((state) => state.undo);

  const redo = useVennStore((state) => state.redo);

  const [isEditing, setIsEditing] = useState(false);

  const [draftName, setDraftName] = useState(diagramName);

  useEffect(() => {
    if (!isEditing) {
      setDraftName(diagramName);
    }
  }, [diagramName, isEditing]);

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

  function startEditing() {
    setDraftName(diagramName);
    setIsEditing(true);
  }

  function saveName() {
    const name = draftName.trim();

    if (name) {
      renameDiagram(name);
    } else {
      setDraftName(diagramName);
    }

    setIsEditing(false);
  }

  function cancelEditing() {
    setDraftName(diagramName);
    setIsEditing(false);
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b-4 border-accent bg-brand-primary px-3 py-3 text-white sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2 sm:gap-4">
        <img
          alt="Universidad Católica Silva Henríquez"
          className="hidden h-12 w-auto shrink-0 object-contain sm:block"
          src="/logo.png"
        />

        <div aria-hidden="true" className="hidden h-10 w-px bg-white/20 sm:block" />

        <FileText aria-hidden="true" className="size-5 shrink-0 text-white/80" />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              aria-label="Nombre del diagrama"
              autoComplete="off"
              autoFocus
              className="h-9 w-full rounded-md border border-white/50 bg-white/10 px-2 text-sm font-bold text-white outline-none transition-colors placeholder:text-white/40 focus:border-white focus:bg-white/15 sm:h-10 sm:max-w-md sm:text-lg"
              onBlur={saveName}
              onChange={(event) => {
                setDraftName(event.target.value);
              }}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveName();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEditing();
                }
              }}
              spellCheck={false}
              type="text"
              value={draftName}
            />
          ) : (
            <button
              className="block max-w-full rounded-md px-2 py-1.5 text-left text-sm font-bold tracking-tight text-white transition-colors hover:bg-white/10 sm:text-lg"
              onClick={startEditing}
              title="Cambiar nombre del diagrama"
              type="button"
            >
              <span className="block truncate">{diagramName}</span>
            </button>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ExportMenu />

          <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-white/20 sm:mx-1 sm:h-7" />

          <button
            aria-label="Deshacer"
            className="grid size-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
            disabled={!canUndo}
            onClick={undo}
            title="Deshacer (Ctrl + Z)"
            type="button"
          >
            <Undo2 aria-hidden="true" className="size-4 sm:size-5" />
          </button>

          <button
            aria-label="Rehacer"
            className="grid size-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
            disabled={!canRedo}
            onClick={redo}
            title="Rehacer (Ctrl + Shift + Z)"
            type="button"
          >
            <Redo2 aria-hidden="true" className="size-4 sm:size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
