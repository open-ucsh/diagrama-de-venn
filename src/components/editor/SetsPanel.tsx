import { Circle } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

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

export function SetsPanel() {
  const sets = useVennStore((state) => state.diagram.sets);
  const selection = useVennStore((state) => state.selection);
  const select = useVennStore((state) => state.select);

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
              onClick={() => select({ id: set.id, kind: "set" })}
              type="button"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-xl border ${style.borderClassName} ${style.backgroundClassName} ${style.iconClassName}`}
              >
                <Circle className="size-5" />
              </span>

              <div className="min-w-0">
                <p className="truncate font-bold">{set.name}</p>
                <p className="mt-0.5 text-sm text-text-muted">Radio {set.radius}px</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
