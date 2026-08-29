import { useState } from "react";

import { Check, Circle, Pencil, Plus, Trash2, X } from "lucide-react";

import type { Point, VennSet } from "@/domain/venn/models";

import { MAX_SETS, MIN_SETS } from "@/domain/venn/operations";

import { useVennStore } from "@/state/venn-store";

const DEFAULT_SET_NAMES = ["A", "B", "C"] as const;

const DEFAULT_SET_POSITIONS: Point[] = [
  { x: 370, y: 300 },
  { x: 530, y: 300 },
  { x: 450, y: 420 },
];

const SET_STYLES = [
  {
    backgroundClassName: "bg-brand-primary/10",
    borderClassName: "border-brand-primary/20",
    iconClassName: "text-brand-primary",
  },
  {
    backgroundClassName: "bg-accent/20",
    borderClassName: "border-amber-500/20",
    iconClassName: "text-amber-700",
  },
  {
    backgroundClassName: "bg-violet-500/10",
    borderClassName: "border-violet-500/20",
    iconClassName: "text-violet-700",
  },
] as const;

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getMinimumDistance(position: Point, sets: VennSet[]): number {
  if (sets.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...sets.map((set) => getDistance(position, set.position)));
}

function getNextSetPosition(sets: VennSet[]): Point {
  const [firstPosition, ...remainingPositions] = DEFAULT_SET_POSITIONS;

  if (!firstPosition) {
    return {
      x: 450,
      y: 300,
    };
  }

  return remainingPositions.reduce((bestPosition, candidatePosition) => {
    const bestDistance = getMinimumDistance(bestPosition, sets);

    const candidateDistance = getMinimumDistance(candidatePosition, sets);

    return candidateDistance > bestDistance ? candidatePosition : bestPosition;
  }, firstPosition);
}

function getNextSetName(sets: VennSet[]): string {
  const usedNames = new Set(sets.map((set) => set.name.trim().toUpperCase()));

  return DEFAULT_SET_NAMES.find((name) => !usedNames.has(name)) ?? `Conjunto ${sets.length + 1}`;
}

export function SetsPanel() {
  const sets = useVennStore((state) => state.diagram.sets);

  const createSet = useVennStore((state) => state.createSet);

  const renameSet = useVennStore((state) => state.renameSet);

  const removeSet = useVennStore((state) => state.removeSet);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");

  const canCreateSet = sets.length < MAX_SETS;

  const canRemoveSet = sets.length > MIN_SETS;

  function handleCreateSet() {
    if (!canCreateSet) {
      return;
    }

    createSet(getNextSetName(sets), getNextSetPosition(sets));
  }

  function startEditing(set: VennSet) {
    setEditingSetId(set.id);
    setDraftName(set.name);
  }

  function cancelEditing() {
    setEditingSetId(null);
    setDraftName("");
  }

  function saveName(set: VennSet) {
    const name = draftName.trim();

    if (name && name !== set.name) {
      renameSet(set.id, name);
    }

    cancelEditing();
  }

  function handleRemoveSet(set: VennSet) {
    if (!canRemoveSet) {
      return;
    }

    const confirmed = window.confirm(`¿Quieres eliminar el conjunto "${set.name}"?`);

    if (!confirmed) {
      return;
    }

    removeSet(set.id);

    if (editingSetId === set.id) {
      cancelEditing();
    }
  }

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-border bg-white lg:border-r lg:border-b-0">
      <header className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Conjuntos</p>
      </header>

      <div className="space-y-2 p-4">
        {sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          const isEditing = editingSetId === set.id;

          return (
            <article
              className="group rounded-xl border border-border bg-white p-3 transition-colors hover:border-brand-primary/30 hover:bg-surface/50"
              key={set.id}
            >
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${style.borderClassName} ${style.backgroundClassName} ${style.iconClassName}`}
                  >
                    <Circle aria-hidden="true" className="size-5" />
                  </span>

                  <input
                    aria-label={`Nuevo nombre para ${set.name}`}
                    autoFocus
                    className="h-10 min-w-0 flex-1 rounded-lg border-2 border-brand-primary/40 bg-white px-3 font-bold text-ink outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
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
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-white hover:text-ink"
                    onClick={cancelEditing}
                    title="Cancelar"
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>

                  <button
                    aria-label="Guardar nombre"
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={draftName.trim().length === 0}
                    onClick={() => saveName(set)}
                    title="Guardar nombre"
                    type="button"
                  >
                    <Check aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${style.borderClassName} ${style.backgroundClassName} ${style.iconClassName}`}
                  >
                    <Circle aria-hidden="true" className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-ink">{set.name}</p>

                    <p className="mt-0.5 text-xs font-medium text-text-muted">
                      Conjunto {index + 1}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label={`Renombrar conjunto ${set.name}`}
                      className="grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
                      onClick={() => startEditing(set)}
                      title="Renombrar conjunto"
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>

                    <button
                      aria-label={`Eliminar conjunto ${set.name}`}
                      className="grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
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
          );
        })}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-bold text-text-muted transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted"
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
