import { useState } from "react";

import { ChevronDown, Plus } from "lucide-react";

import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { VennSet } from "@/domain/venn/models";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";
import { useVennStore } from "@/state/venn-store";

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
  const sets = useVennStore((state) => state.diagram.sets);
  const createSet = useVennStore((state) => state.createSet);
  const renameSet = useVennStore((state) => state.renameSet);
  const removeSet = useVennStore((state) => state.removeSet);
  const setSetColor = useVennStore((state) => state.setSetColor);
  const toggleSetVisibility = useVennStore((state) => state.toggleSetVisibility);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const canCreateSet = sets.length < MAX_SETS;
  const canRemoveSet = sets.length > MIN_SETS;

  function handleCreateSet() {
    if (!canCreateSet) return;

    setCreateError(null);
    setIsMobilePanelOpen(true);

    try {
      createSet(getNextSetName(sets), getNextSetPosition(sets));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    }
  }

  function startEditing(set: VennSet) {
    setEditingSetId(set.id);
    setDraftName(set.name);
    setNameError(null);
  }

  function cancelEditing() {
    setEditingSetId(null);
    setDraftName("");
    setNameError(null);
  }

  function saveName(set: VennSet) {
    try {
      if (draftName !== set.name) {
        renameSet(set.id, draftName);
      }

      cancelEditing();
    } catch (error) {
      setNameError(getErrorMessage(error));
    }
  }

  function handleRemoveSet(set: VennSet) {
    if (!canRemoveSet) return;

    const confirmed = window.confirm(`¿Quieres eliminar el conjunto "${set.name}"?`);

    if (!confirmed) return;

    removeSet(set.id);
    setCreateError(null);

    if (editingSetId === set.id) {
      cancelEditing();
    }
  }

  return (
    <aside className="venn-sets-panel__card shrink-0 border-b border-border bg-white lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <header className="venn-sets-panel__header border-b border-border">
        <button
          aria-controls="venn-sets-panel"
          aria-expanded={isMobilePanelOpen}
          className="flex w-full items-center gap-3 px-4 py-3 text-left lg:hidden"
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
        {sets.map((set, index) => {
          const isEditing = editingSetId === set.id;
          const color = getSetColor(set, index);
          return (
            <div className="w-full" key={set.id}>
              <SetPanelItem
                set={set}
                index={index}
                color={color}
                isEditing={isEditing}
                draftName={draftName}
                nameError={nameError}
                canRemoveSet={canRemoveSet}
                setDraftName={setDraftName}
                setNameError={setNameError}
                cancelEditing={cancelEditing}
                saveName={saveName}
                setSetColor={setSetColor}
                toggleSetVisibility={toggleSetVisibility}
                startEditing={startEditing}
                handleRemoveSet={handleRemoveSet}
              />

              {index < sets.length - 1 && (
                <div aria-hidden="true" className="h-px w-full bg-border" />
              )}
            </div>
          );
        })}

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
          className="venn-sets-panel__add-button mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-bold text-text-muted transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted"
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
