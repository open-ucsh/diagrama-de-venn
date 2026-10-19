import { Check, FileText, Pencil, Redo2, Undo2, X } from "lucide-react";
import { type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from "react";

import { ExportMenu } from "@/components/editor/ExportMenu";
import { KeyboardShortcutsHelp } from "@/components/editor/KeyboardShortcutsHelp";
import { useHistoryShortcuts } from "@/components/editor/use-history-shortcuts";
import { useVennStore } from "@/state/venn-store";

export function EditorHeader() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const diagramName = useVennStore((state) => state.diagram.metadata.name);
  const renameDiagram = useVennStore((state) => state.renameDiagram);
  const canUndo = useVennStore((state) => state.past.length > 0);
  const canRedo = useVennStore((state) => state.future.length > 0);
  const undo = useVennStore((state) => state.undo);
  const redo = useVennStore((state) => state.redo);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(diagramName);
  const restoreFocusRef = useRef(false);

  useHistoryShortcuts({ canUndo, canRedo, undo, redo });

  useLayoutEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    if (restoreFocusRef.current) {
      editButtonRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [isEditing]);

  function startEditing(): void {
    setDraftName(diagramName);
    setIsEditing(true);
  }

  function finishEditing(): void {
    restoreFocusRef.current = true;
    setIsEditing(false);
  }

  function saveName(): void {
    const name = draftName.trim();

    if (name) {
      renameDiagram(name);
    } else {
      setDraftName(diagramName);
    }

    finishEditing();
  }

  function cancelEditing(): void {
    setDraftName(diagramName);
    finishEditing();
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      saveName();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-white text-text">
      <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <a
          aria-label="Universidad Católica Silva Henríquez"
          className="flex shrink-0 items-center rounded-md p-1 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          href="/"
        >
          <img alt="" className="size-9 shrink-0 object-contain sm:size-12" src="/favicon.png" />
        </a>

        <span aria-hidden="true" className="hidden h-10 w-px shrink-0 bg-border sm:block" />

        <FileText
          aria-hidden="true"
          className="hidden size-5 shrink-0 text-brand-primary sm:block"
        />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex max-w-lg items-center gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-text-muted" htmlFor={inputId}>
                  Editar nombre
                </label>

                <input
                  aria-label="Nombre del diagrama"
                  autoComplete="off"
                  className="h-9 w-full border-b border-brand-primary bg-transparent px-1 text-base font-semibold text-brand-primary outline-none focus:border-b-2 sm:text-lg"
                  id={inputId}
                  onChange={(event) => setDraftName(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={handleNameKeyDown}
                  ref={inputRef}
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
              className="group flex w-full min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={startEditing}
              ref={editButtonRef}
              title="Cambiar nombre del diagrama"
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base leading-6 font-bold tracking-tight text-brand-primary sm:text-lg">
                  {diagramName}
                </span>

                <span className="hidden text-sm leading-5 text-text-muted sm:block">
                  Diagrama de Venn
                </span>
              </span>

              <Pencil
                aria-hidden="true"
                className="hidden size-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
              />
            </button>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <ExportMenu />
          <KeyboardShortcutsHelp />

          <span aria-hidden="true" className="mx-2 hidden h-8 w-px bg-border sm:block" />

          <button
            aria-label="Deshacer"
            aria-keyshortcuts="Control+Z Meta+Z"
            className="hidden size-10 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-35 sm:grid"
            disabled={!canUndo}
            onClick={undo}
            title="Deshacer (Ctrl/Cmd + Z)"
            type="button"
          >
            <Undo2 aria-hidden="true" className="size-5" />
          </button>

          <button
            aria-label="Rehacer"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y"
            className="hidden size-10 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-35 sm:grid"
            disabled={!canRedo}
            onClick={redo}
            title="Rehacer (Ctrl/Cmd + Shift + Z)"
            type="button"
          >
            <Redo2 aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
