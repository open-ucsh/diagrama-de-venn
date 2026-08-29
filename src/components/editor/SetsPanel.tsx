import { Circle, Plus } from "lucide-react";

import type { Point, VennSet } from "@/domain/venn/models";
import { MAX_SETS } from "@/domain/venn/operations";
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
    return { x: 450, y: 300 };
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
  const selection = useVennStore((state) => state.selection);
  const createSet = useVennStore((state) => state.createSet);
  const select = useVennStore((state) => state.select);

  const canCreateSet = sets.length < MAX_SETS;

  function handleCreateSet() {
    if (!canCreateSet) {
      return;
    }

    createSet(getNextSetName(sets), getNextSetPosition(sets));
  }

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-border bg-white lg:col-span-3 lg:border-r lg:border-b-0">
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Conjuntos</p>
      </div>

      <div className="space-y-3 p-5">
        {sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          const isSelected = selection?.kind === "set" && selection.id === set.id;

          return (
            <button
              aria-pressed={isSelected}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? `${style.borderClassName} ${style.backgroundClassName}`
                  : "border-border bg-white hover:bg-surface"
              }`}
              key={set.id}
              onClick={() =>
                select({
                  id: set.id,
                  kind: "set",
                })
              }
              type="button"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-xl border ${style.borderClassName} ${style.backgroundClassName} ${style.iconClassName}`}
              >
                <Circle aria-hidden="true" className="size-5" />
              </span>

              <span className="min-w-0">
                <span className="block truncate font-bold">{set.name}</span>

                <span className="mt-0.5 block text-sm text-text-muted">Radio {set.radius}px</span>
              </span>
            </button>
          );
        })}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-muted"
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
