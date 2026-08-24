import type { KeyboardEvent } from "react";

import { useVennStore } from "../../state/venn-store";

const SET_STYLES = [
  {
    fillClassName: "fill-brand-primary/10",
    strokeClassName: "stroke-brand-primary",
    textClassName: "fill-brand-primary",
  },
  {
    fillClassName: "fill-accent/25",
    strokeClassName: "stroke-amber-500",
    textClassName: "fill-amber-700",
  },
  {
    fillClassName: "fill-violet-500/10",
    strokeClassName: "stroke-violet-600",
    textClassName: "fill-violet-700",
  },
] as const;

export function VennCanvas() {
  const sets = useVennStore((state) => state.diagram.sets);
  const selection = useVennStore((state) => state.selection);
  const select = useVennStore((state) => state.select);

  function handleSetKeyDown(event: KeyboardEvent<SVGGElement>, setId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select({ id: setId, kind: "set" });
    }
  }

  return (
    <svg
      aria-label="Diagrama de Venn"
      className="h-auto w-full max-w-5xl"
      onClick={() => select(null)}
      role="img"
      viewBox="0 0 900 600"
    >
      <rect fill="transparent" height="600" width="900" />

      {sets.map((set, index) => {
        const style = SET_STYLES[index];

        if (!style) {
          return null;
        }

        const isSelected = selection?.kind === "set" && selection.id === set.id;
        const labelOffset = index === 0 ? -100 : 100;

        return (
          <g
            aria-label={`Seleccionar conjunto ${set.name}`}
            aria-pressed={isSelected}
            className="cursor-pointer outline-none"
            key={set.id}
            onClick={(event) => {
              event.stopPropagation();
              select({ id: set.id, kind: "set" });
            }}
            onKeyDown={(event) => handleSetKeyDown(event, set.id)}
            role="button"
            tabIndex={0}
          >
            <circle
              cx={set.position.x}
              cy={set.position.y}
              r={set.radius}
              className={`${style.fillClassName} ${style.strokeClassName}`}
              strokeWidth={isSelected ? 7 : 4}
            />

            <text
              x={set.position.x + labelOffset}
              y={set.position.y}
              className={`${style.textClassName} pointer-events-none text-3xl font-bold`}
              textAnchor="middle"
            >
              {set.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
