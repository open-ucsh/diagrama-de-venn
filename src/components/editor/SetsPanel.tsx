import { useState } from "react";

import { Check, ChevronDown, Circle, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";

import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { Point, VennSet } from "@/domain/venn/models";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";
import { useVennStore } from "@/state/venn-store";

const DEFAULT_SET_NAMES = ["A", "B", "C", "D"] as const;

const DEFAULT_SET_POSITIONS: Point[] = [
  { x: 370, y: 300 },
  { x: 530, y: 300 },
  { x: 450, y: 420 },
  { x: 450, y: 300 },
];

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getMinimumDistance(position: Point, sets: VennSet[]): number {
  if (sets.length === 0) return Number.POSITIVE_INFINITY;

  return Math.min(...sets.map((set) => getDistance(position, set.position)));
}

function getNextSetPosition(sets: VennSet[]): Point {
  const [firstPosition, ...remainingPositions] = DEFAULT_SET_POSITIONS;

  if (!firstPosition) return { x: 450, y: 300 };

  return remainingPositions.reduce((bestPosition, candidatePosition) => {
    const bestDistance = getMinimumDistance(bestPosition, sets);
    const candidateDistance = getMinimumDistance(candidatePosition, sets);

    return candidateDistance > bestDistance ? candidatePosition : bestPosition;
  }, firstPosition);
}

function getNextSetName(sets: VennSet[]): string {
  const usedNames = new Set(sets.map((set) => set.name.trim().replace(/\s+/g, " ").toLowerCase()));

  const availableName = DEFAULT_SET_NAMES.find((name) => !usedNames.has(name.toLowerCase()));

  if (availableName) return availableName;

  let index = sets.length + 1;

  while (usedNames.has(`conjunto ${index}`)) {
    index += 1;
  }

  return `Conjunto ${index}`;
}

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
          const errorId = `set-name-error-${set.id}`;

          return (
            <div className="w-full" key={set.id}>
              <article
                className={["venn-sets-panel__item py-3", set.hidden ? "opacity-60" : ""].join(" ")}
              >
                {isEditing ? (
                  <div>
                    <div className="venn-sets-panel__item-content flex items-center gap-2">
                      <span
                        className="venn-sets-panel__color-control grid size-9 shrink-0 place-items-center rounded-md border"
                        style={{
                          backgroundColor: `${color}14`,
                          borderColor: `${color}40`,
                          color,
                        }}
                      >
                        <Circle aria-hidden="true" className="size-4.5" />
                      </span>

                      <input
                        aria-describedby={nameError ? errorId : undefined}
                        aria-invalid={Boolean(nameError)}
                        aria-label={`Nuevo nombre para ${set.name}`}
                        autoFocus
                        className={[
                          "h-9 min-w-0 flex-1 border-b bg-transparent px-1 text-sm font-semibold text-text outline-none focus:border-b-2",
                          nameError ? "border-red-600" : "border-brand-primary",
                        ].join(" ")}
                        onChange={(event) => {
                          setDraftName(event.target.value);
                          setNameError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.nativeEvent.isComposing) return;

                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveName(set);
                          }

                          if (event.key === "Escape") {
                            cancelEditing();
                          }
                        }}
                        value={draftName}
                      />

                      <button
                        aria-label="Cancelar edición"
                        className="venn-sets-panel__action grid size-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-surface hover:text-text"
                        onClick={cancelEditing}
                        title="Cancelar"
                        type="button"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>

                      <button
                        aria-label="Guardar nombre"
                        className="venn-sets-panel__action grid size-8 shrink-0 place-items-center bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover"
                        onClick={() => saveName(set)}
                        title="Guardar nombre"
                        type="button"
                      >
                        <Check aria-hidden="true" className="size-4" />
                      </button>
                    </div>

                    {nameError && (
                      <p className="mt-2 text-xs leading-5 text-red-700" id={errorId} role="alert">
                        {nameError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="venn-sets-panel__item-content flex min-h-14 items-center gap-3">
                    <label
                      className="venn-sets-panel__color-control relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors hover:brightness-95"
                      style={{
                        backgroundColor: `${color}14`,
                        borderColor: `${color}40`,
                        color,
                      }}
                      title={`Cambiar color de ${set.name}`}
                    >
                      <Circle aria-hidden="true" className="size-4.5" />
                      <input
                        aria-label={`Cambiar color del conjunto ${set.name}`}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => {
                          setSetColor(set.id, event.target.value);
                        }}
                        type="color"
                        value={color}
                      />
                    </label>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text">{set.name}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        Conjunto {index + 1}
                        {set.hidden ? " · oculto" : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        aria-label={
                          set.hidden
                            ? `Mostrar conjunto ${set.name}`
                            : `Ocultar conjunto ${set.name}`
                        }
                        className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                        onClick={() => toggleSetVisibility(set.id)}
                        title={set.hidden ? "Mostrar conjunto" : "Ocultar temporalmente"}
                        type="button"
                      >
                        {set.hidden ? (
                          <EyeOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Eye aria-hidden="true" className="size-4" />
                        )}
                      </button>

                      <button
                        aria-label={`Renombrar conjunto ${set.name}`}
                        className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary"
                        onClick={() => startEditing(set)}
                        title="Renombrar conjunto"
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>

                      <button
                        aria-label={`Eliminar conjunto ${set.name}`}
                        className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={!canRemoveSet}
                        onClick={() => handleRemoveSet(set)}
                        title={
                          canRemoveSet
                            ? "Eliminar conjunto"
                            : `Debe existir al menos ${MIN_SETS} conjunto`
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>

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
