import { ChevronDown, Plus } from "lucide-react";
import { useId, useState } from "react";

import { SetPanelItem } from "@/components/editor/sets/SetPanelItem";
import { getNextSetName, getNextSetPosition } from "@/components/editor/sets/set-defaults";
import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { VennSet } from "@/domain/venn/models";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";
import { useVennStore } from "@/state/venn-store";

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_SET_COLORS[index] ?? DEFAULT_SET_COLORS[0];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function SetsPanel() {
  const panelId = useId();

  const sets = useVennStore((state) => state.diagram.sets);
  const createSet = useVennStore((state) => state.createSet);
  const renameSet = useVennStore((state) => state.renameSet);
  const removeSet = useVennStore((state) => state.removeSet);
  const setSetColor = useVennStore((state) => state.setSetColor);
  const toggleSetVisibility = useVennStore((state) => state.toggleSetVisibility);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const canCreateSet = sets.length < MAX_SETS;
  const canRemoveSet = sets.length > MIN_SETS;

  function handleCreateSet(): void {
    if (!canCreateSet) {
      return;
    }

    setPanelError(null);
    setIsMobilePanelOpen(true);

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

  function startEditing(set: VennSet): void {
    setEditingSetId(set.id);
    setDraftName(set.name);
    setNameError(null);
  }

  function cancelEditing(): void {
    setEditingSetId(null);
    setDraftName("");
    setNameError(null);
  }

  function saveName(set: VennSet): void {
    try {
      if (draftName !== set.name) {
        renameSet(set.id, draftName);

        const renamedSet = useVennStore
          .getState()
          .diagram.sets.find((current) => current.id === set.id);

        if (renamedSet && renamedSet.name !== set.name) {
          setAnnouncement(`Conjunto renombrado a ${renamedSet.name}.`);
        }
      }

      cancelEditing();
    } catch (error) {
      setNameError(
        getErrorMessage(error, "No fue posible guardar el nombre. Inténtalo nuevamente."),
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

    const confirmed = window.confirm(`¿Quieres eliminar el conjunto "${set.name}"?`);

    if (!confirmed) {
      return;
    }

    setPanelError(null);

    try {
      removeSet(set.id);
      setAnnouncement(`Conjunto ${set.name} eliminado.`);

      if (editingSetId === set.id) {
        cancelEditing();
      }
    } catch (error) {
      setPanelError(
        getErrorMessage(error, "No fue posible eliminar el conjunto. Inténtalo nuevamente."),
      );
    }
  }

  return (
    <aside
      aria-label="Editor de conjuntos"
      className="venn-sets-panel__card shrink-0 border-b border-border bg-white lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
    >
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header className="venn-sets-panel__header border-b border-border">
        <button
          aria-controls={panelId}
          aria-expanded={isMobilePanelOpen}
          className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary lg:hidden"
          onClick={() => setIsMobilePanelOpen((open) => !open)}
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
        id={panelId}
      >
        {sets.map((set, index) => (
          <div className="w-full" key={set.id}>
            <SetPanelItem
              canRemoveSet={canRemoveSet}
              cancelEditing={cancelEditing}
              color={getSetColor(set, index)}
              draftName={draftName}
              handleRemoveSet={handleRemoveSet}
              index={index}
              isEditing={editingSetId === set.id}
              nameError={nameError}
              saveName={saveName}
              set={set}
              setDraftName={setDraftName}
              setNameError={setNameError}
              setSetColor={handleSetColor}
              startEditing={startEditing}
              toggleSetVisibility={handleToggleVisibility}
            />

            {index < sets.length - 1 && (
              <div aria-hidden="true" className="h-px w-full bg-border" />
            )}
          </div>
        ))}

        {sets.length === MAX_SETS && (
          <div className="my-3 border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-emerald-800">Diagrama de cuatro conjuntos</p>

            <p className="mt-1 text-xs leading-5 text-text-muted">
              Los círculos se transformaron en elipses para representar las 16 regiones posibles.
            </p>
          </div>
        )}

        {panelError && (
          <p className="my-3 text-xs leading-5 text-red-700" role="alert">
            {panelError}
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
