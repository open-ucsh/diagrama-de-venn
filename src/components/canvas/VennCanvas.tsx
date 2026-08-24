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

  return (
    <svg
      aria-label="Diagrama de Venn"
      className="h-auto w-full max-w-5xl"
      role="img"
      viewBox="0 0 900 600"
    >
      {sets.map((set, index) => {
        const style = SET_STYLES[index];

        if (!style) {
          return null;
        }

        const labelOffset = index === 0 ? -100 : 100;

        return (
          <g key={set.id}>
            <circle
              cx={set.position.x}
              cy={set.position.y}
              r={set.radius}
              className={`${style.fillClassName} ${style.strokeClassName}`}
              strokeWidth="4"
            />

            <text
              x={set.position.x + labelOffset}
              y={set.position.y}
              className={`${style.textClassName} text-3xl font-bold`}
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
