import { useEffect, useState } from "react";

import { Check, FileText, Pencil, Redo2, Undo2, X } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

import { ExportMenu } from "./ExportMenu";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

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
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableElement(event.target)) return;

      const hasModifier = event.ctrlKey || event.metaKey;
      if (!hasModifier) return;

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

    if (!name) {
      setDraftName(diagramName);
      setIsEditing(false);
      return;
    }

    renameDiagram(name);
    setIsEditing(false);
  }

  function cancelEditing() {
    setDraftName(diagramName);
    setIsEditing(false);
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-white text-text">
      <div className="mx-auto flex min-h-20 max-w-screen-2xl items-center gap-3 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <a
          aria-label="Universidad Católica Silva Henríquez"
          className="flex shrink-0 items-center rounded-md p-1 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          href="/"
        >
          <img
            alt="Universidad Católica Silva Henríquez"
            className="size-12 shrink-0 object-contain"
            src="/favicon.png"
          />
        </a>

        <span aria-hidden="true" className="h-10 w-px shrink-0 bg-border" />

        <FileText aria-hidden="true" className="size-5 shrink-0 text-brand-primary" />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex max-w-lg items-center gap-2">
              <div className="min-w-0 flex-1">
                <label
                  className="mb-1 block text-xs font-medium text-text-muted"
                  htmlFor="diagram-name"
                >
                  Editar nombre
                </label>
                <input
                  id="diagram-name"
                  aria-label="Nombre del diagrama"
                  autoComplete="off"
                  autoFocus
                  className="h-9 w-full border-b border-brand-primary bg-transparent px-1 text-base font-semibold text-brand-primary outline-none focus:border-b-2 sm:text-lg"
                  onChange={(event) => setDraftName(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
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
              </div>

              <button
                aria-label="Guardar nombre"
                className="grid size-9 shrink-0 place-items-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                onClick={saveName}
                title="Guardar nombre"
                type="button"
              >
                <Check aria-hidden="true" className="size-4.5" />
              </button>

              <button
                aria-label="Cancelar edición"
                className="grid size-9 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                onClick={cancelEditing}
                title="Cancelar"
                type="button"
              >
                <X aria-hidden="true" className="size-4.5" />
              </button>
            </div>
          ) : (
            <button
              className="group flex max-w-full items-center gap-2 text-left"
              onClick={startEditing}
              title="Cambiar nombre del diagrama"
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-base leading-6 font-bold tracking-tight text-brand-primary sm:text-lg">
                  {diagramName}
                </span>
                <span className="hidden text-sm leading-5 text-text-muted sm:block">
                  Diagrama de Venn
                </span>
              </span>
              <Pencil
                aria-hidden="true"
                className="size-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </button>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <ExportMenu />

          <span aria-hidden="true" className="mx-1 h-8 w-px bg-border sm:mx-2" />

          <button
            aria-label="Deshacer"
            className="grid size-10 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canUndo}
            onClick={undo}
            title="Deshacer (Ctrl + Z)"
            type="button"
          >
            <Undo2 aria-hidden="true" className="size-5" />
          </button>

          <button
            aria-label="Rehacer"
            className="grid size-10 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-35"
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
