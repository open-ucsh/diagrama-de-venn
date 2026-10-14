import { useState } from "react";

import { ChevronDown, Pencil, Plus } from "lucide-react";

import { formatElementLabels, getSetElements } from "@/domain/venn/elements";
import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { VennSet } from "@/domain/venn/models";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";
import { saveSetDefinition, saveUniverseDefinition } from "@/state/venn-element-actions";
import { useVennStore } from "@/state/venn-store";

import { DefinitionEditor } from "./DefinitionEditor";
import { SetPanelItem } from "./SetPanelItem";
import { getNextSetName, getNextSetPosition } from "./set-defaults";

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_SET_COLORS[index] ?? DEFAULT_SET_COLORS[0];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No fue posible guardar el conjunto. Inténtalo nuevamente.";
}

export function SetsPanel() {
  const diagram = useVennStore((state) => state.diagram);
  const createSet = useVennStore((state) => state.createSet);
  const removeSet = useVennStore((state) => state.removeSet);
  const setSetColor = useVennStore((state) => state.setSetColor);
  const toggleSetVisibility = useVennStore((state) => state.toggleSetVisibility);

  const [editing, setEditing] = useState<{ kind: "set"; id: string } | { kind: "universe" } | null>(
    null,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const { sets } = diagram;
  const canCreateSet = sets.length < MAX_SETS;
  const canRemoveSet = sets.length > MIN_SETS;
  const universeLabels = diagram.elements.map((element) => element.label);
  const universePreview = formatElementLabels(universeLabels);
  const isEditingUniverse = editing?.kind === "universe";

  function handleCreateSet() {
    if (!canCreateSet) return;

    setCreateError(null);
    setIsMobilePanelOpen(true);
    const name = getNextSetName(sets);

    try {
      createSet(name, getNextSetPosition(sets));
      setAnnouncement(`Conjunto ${name} añadido.`);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    }
  }

  function handleToggleVisibility(setId: string) {
    const set = sets.find((currentSet) => currentSet.id === setId);

    if (!set) return;

    toggleSetVisibility(setId);
    setAnnouncement(set.hidden ? `Conjunto ${set.name} mostrado.` : `Conjunto ${set.name} oculto.`);
  }

  function handleRemoveSet(set: VennSet) {
    if (!canRemoveSet) return;

    const confirmed = window.confirm(`¿Quieres eliminar el conjunto "${set.name}"?`);

    if (!confirmed) return;

    removeSet(set.id);
    setCreateError(null);
    setAnnouncement(`Conjunto ${set.name} eliminado.`);

    if (editing?.kind === "set" && editing.id === set.id) {
      setEditing(null);
    }
  }

  return (
    <aside
      aria-label="Editor de conjuntos"
      className="venn-sets-panel__card shrink-0 border-b border-border bg-white lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
    >
      <header className="venn-sets-panel__header border-b border-border">
        <button
          aria-controls="venn-sets-panel"
          aria-expanded={isMobilePanelOpen}
          className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary lg:hidden"
          onClick={() => setIsMobilePanelOpen((current) => !current)}
          type="button"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Conjuntos
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
              {sets.length}
            </span>
          </span>

          <span className="text-xs font-medium text-text-muted">
            {isMobilePanelOpen ? "Ocultar" : "Editar"}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={[
              "size-5 text-text-muted transition-transform",
              isMobilePanelOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        <div className="venn-sets-panel__desktop-header hidden items-center justify-between px-5 py-4 lg:flex">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Conjuntos</p>
          <span className="bg-surface px-2 py-1 text-xs font-semibold text-text-muted">
            {sets.length}/{MAX_SETS}
          </span>
        </div>
      </header>

      <div
        className={[
          "venn-sets-panel__content max-h-96 overflow-y-auto px-4",
          isMobilePanelOpen ? "block" : "hidden",
          "lg:block lg:max-h-none lg:overflow-visible",
        ].join(" ")}
        id="venn-sets-panel"
      >
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {sets.map((set, index) => (
          <SetPanelItem
            canRemoveSet={canRemoveSet}
            cancelEditing={() => setEditing(null)}
            color={getSetColor(set, index)}
            elements={getSetElements(diagram, set.id).map((element) => element.label)}
            handleRemoveSet={handleRemoveSet}
            index={index}
            isEditing={editing?.kind === "set" && editing.id === set.id}
            key={set.id}
            saveDefinition={(name, elements) => {
              saveSetDefinition(set.id, name, elements);
              setAnnouncement(`Conjunto ${name.trim()} actualizado.`);
            }}
            set={set}
            setSetColor={setSetColor}
            startEditing={(currentSet) => setEditing({ kind: "set", id: currentSet.id })}
            toggleSetVisibility={handleToggleVisibility}
          />
        ))}

        <div className="border-b border-border py-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text">Universo U</p>
              <p className="mt-1 truncate text-xs text-text-muted" title={universePreview}>
                {universePreview}
              </p>
            </div>

            <button
              aria-expanded={isEditingUniverse}
              aria-label="Editar elementos del universo"
              className="venn-sets-panel__action grid size-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={() => setEditing(isEditingUniverse ? null : { kind: "universe" })}
              title="Editar universo"
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          </div>

          {isEditingUniverse && (
            <DefinitionEditor
              initialElements={universeLabels.join(", ")}
              onClose={() => setEditing(null)}
              onSave={(_name, elements) => {
                saveUniverseDefinition(elements);
                setAnnouncement("Universo actualizado.");
              }}
              title="Editar universo U"
            />
          )}
        </div>

        {sets.length === MAX_SETS && (
          <div className="my-3 border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-emerald-800">Diagrama de cuatro conjuntos</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Los círculos se transformaron en elipses para representar las 16 regiones posibles.
            </p>
          </div>
        )}

        {createError && (
          <p className="my-3 text-xs leading-5 text-red-700" role="alert">
            {createError}
          </p>
        )}

        <button
          className="venn-sets-panel__add-button mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-bold text-text-muted transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted"
          disabled={!canCreateSet}
          onClick={handleCreateSet}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {canCreateSet ? "Añadir conjunto" : `Máximo de ${MAX_SETS} conjuntos`}
        </button>
      </div>
    </aside>
  );
}
