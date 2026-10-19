import { ChevronDown, Pencil, Plus } from "lucide-react";
import { useId, useState } from "react";

import { DefinitionEditor } from "@/components/editor/sets/DefinitionEditor";
import { SetPanelItem } from "@/components/editor/sets/SetPanelItem";
import { getNextSetName, getNextSetPosition } from "@/components/editor/sets/set-defaults";
import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";
import { formatElementLabels, getSetElements } from "@/domain/venn/elements";
import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { VennSet } from "@/domain/venn/models";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";
import { saveSetDefinition, saveUniverseDefinition } from "@/state/venn-element-actions";
import { useVennStore } from "@/state/venn-store";

type EditingTarget = { kind: "set"; id: string } | { kind: "universe" } | null;

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_SET_COLORS[index] ?? DEFAULT_SET_COLORS[0];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function SetsPanel() {
  const panelId = useId();

  const diagram = useVennStore((state) => state.diagram);
  const createSet = useVennStore((state) => state.createSet);
  const removeSet = useVennStore((state) => state.removeSet);
  const setSetColor = useVennStore((state) => state.setSetColor);
  const toggleSetVisibility = useVennStore((state) => state.toggleSetVisibility);

  const [editing, setEditing] = useState<EditingTarget>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const [announcement, setAnnouncement] = useState("");

  const { sets } = diagram;
  const canCreateSet = sets.length < MAX_SETS;
  const canRemoveSet = sets.length > MIN_SETS;
  const universeLabels = diagram.elements.map((element) => element.label);
  const universePreview = formatElementLabels(universeLabels);
  const isEditingUniverse = editing?.kind === "universe";

  useKeyboardShortcut({
    code: "Digit1",
    shift: true,
    onTrigger: () => {
      setIsPanelOpen((open) => !open);
    },
  });

  function cancelEditing(): void {
    setEditing(null);
  }

  function startEditing(set: VennSet): void {
    setPanelError(null);
    setEditing({ kind: "set", id: set.id });
  }

  function handleCreateSet(): void {
    if (!canCreateSet) {
      return;
    }

    setPanelError(null);
    setIsPanelOpen(true);

    try {
      const name = getNextSetName(sets);
      const position = getNextSetPosition(sets);

      createSet(name, position);
      setAnnouncement(`Conjunto ${name} añadido.`);
    } catch (error) {
      setPanelError(
        getErrorMessage(error, "No fue posible crear el conjunto. Inténtalo nuevamente."),
      );
    }
  }

  function handleToggleVisibility(setId: string): void {
    const set = sets.find((current) => current.id === setId);

    if (!set) {
      return;
    }

    setPanelError(null);

    try {
      toggleSetVisibility(setId);
      setAnnouncement(
        set.hidden ? `Conjunto ${set.name} mostrado.` : `Conjunto ${set.name} oculto.`,
      );
    } catch (error) {
      setPanelError(getErrorMessage(error, "No fue posible cambiar la visibilidad del conjunto."));
    }
  }

  function handleSetColor(setId: string, color: string): void {
    setPanelError(null);

    try {
      setSetColor(setId, color);
    } catch (error) {
      setPanelError(getErrorMessage(error, "No fue posible cambiar el color del conjunto."));
    }
  }

  function handleRemoveSet(set: VennSet): void {
    if (!canRemoveSet) {
      return;
    }

    if (!window.confirm(`¿Quieres eliminar el conjunto "${set.name}"?`)) {
      return;
    }

    setPanelError(null);

    try {
      removeSet(set.id);
      setAnnouncement(`Conjunto ${set.name} eliminado.`);

      if (editing?.kind === "set" && editing.id === set.id) {
        cancelEditing();
      }
    } catch (error) {
      setPanelError(
        getErrorMessage(error, "No fue posible eliminar el conjunto. Inténtalo nuevamente."),
      );
    }
  }

  return (
    <aside aria-label="Editor de conjuntos" className="venn-sets-panel__card">
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header className="venn-sets-panel__header">
        <button
          aria-controls={panelId}
          aria-expanded={isPanelOpen}
          aria-keyshortcuts="Control+Shift+1 Meta+Shift+1"
          className="flex w-full items-center gap-3 rounded-md text-left"
          onClick={() => setIsPanelOpen((open) => !open)}
          title="Mostrar u ocultar conjuntos (Ctrl/Cmd + Shift + 1)"
          type="button"
        >
          <span className="min-w-0 flex-1 text-sm font-semibold text-brand-primary">Conjuntos</span>

          <span className="text-xs tabular-nums text-text-muted">
            {sets.length}/{MAX_SETS}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={[
              "size-4 text-text-muted transition-transform",
              isPanelOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </header>

      <div
        className={["venn-sets-panel__content", isPanelOpen ? "block" : "hidden"].join(" ")}
        id={panelId}
      >
        {sets.map((set, index) => (
          <div className="w-full" key={set.id}>
            <SetPanelItem
              canRemoveSet={canRemoveSet}
              cancelEditing={cancelEditing}
              color={getSetColor(set, index)}
              elements={getSetElements(diagram, set.id).map((element) => element.label)}
              handleRemoveSet={handleRemoveSet}
              index={index}
              isEditing={editing?.kind === "set" && editing.id === set.id}
              saveDefinition={(name, elements) => {
                saveSetDefinition(set.id, name, elements);
                setAnnouncement(`Conjunto ${name.trim()} actualizado.`);
              }}
              set={set}
              setSetColor={handleSetColor}
              startEditing={startEditing}
              toggleSetVisibility={handleToggleVisibility}
            />

            {index < sets.length - 1 && <div aria-hidden="true" className="mx-2 h-px bg-border" />}
          </div>
        ))}

        <div className="mt-2 border-t border-border px-2 py-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-primary">Universo U</p>

              <p className="mt-1 truncate text-xs text-text-muted" title={universePreview}>
                {universePreview}
              </p>
            </div>

            <button
              aria-expanded={isEditingUniverse}
              aria-label="Editar elementos del universo"
              className="venn-sets-panel__action grid size-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary"
              onClick={() => {
                setPanelError(null);
                setEditing(isEditingUniverse ? null : { kind: "universe" });
              }}
              title="Editar universo"
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          </div>

          {isEditingUniverse && (
            <DefinitionEditor
              initialElements={universeLabels.join(", ")}
              onClose={cancelEditing}
              onSave={(_name, elements) => {
                saveUniverseDefinition(elements);
                setAnnouncement("Universo actualizado.");
              }}
              title="Editar universo U"
            />
          )}
        </div>

        {panelError && (
          <p className="my-3 px-2 text-xs leading-5 text-red-700" role="alert">
            {panelError}
          </p>
        )}

        <button
          className="venn-sets-panel__add-button flex w-full items-center justify-center gap-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60"
          disabled={!canCreateSet}
          onClick={handleCreateSet}
          title={canCreateSet ? "Añadir conjunto" : `Máximo de ${MAX_SETS} conjuntos`}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Añadir conjunto
        </button>
      </div>
    </aside>
  );
}
