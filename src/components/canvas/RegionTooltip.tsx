import { formatElementLabels } from "@/domain/venn/elements";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

import type { UniverseBounds } from "./canvas-geometry";

interface RegionTooltipProps {
  formula: string;
  bounds: UniverseBounds;
  elements: string[];
  outsideUniverse?: boolean;
  outsideSets?: boolean;
}

export function RegionTooltip({
  formula,
  bounds,
  elements,
  outsideUniverse = false,
  outsideSets = false,
}: RegionTooltipProps) {
  const label = outsideUniverse ? "Fuera del universo U" : formula;
  const result = formatElementLabels(elements);
  const width = 300;
  const height = outsideUniverse ? 66 : 100;

  const x = Math.max(
    12,
    Math.min(bounds.x + bounds.width - width, VENN_CANVAS_SIZE.width - width - 12),
  );

  const y = Math.max(8, bounds.y - height - 10);
  const anchorX = bounds.x + bounds.width;
  const anchorY = bounds.y;

  const description = outsideUniverse
    ? "Este espacio no pertenece a U."
    : outsideSets
      ? "Dentro de U, fuera de los conjuntos"
      : elements.length === 0
        ? "Región vacía"
        : "Elementos de esta región";

  return (
    <g aria-hidden="true" data-export-ignore pointerEvents="none">
      <title>
        {outsideUniverse
          ? `${label}. ${description}`
          : `${label}. Elementos: ${result}. Cardinalidad: ${elements.length}. ${description}`}
      </title>

      <line
        stroke="#12376b"
        strokeOpacity="0.55"
        strokeWidth="1"
        x1={x + width - 12}
        x2={anchorX}
        y1={y + height}
        y2={anchorY}
      />

      <circle cx={anchorX} cy={anchorY} fill="#12376b" r="4" />

      <rect fill="#12376b" height={height} rx="5" width={width} x={x} y={y} />

      <foreignObject height={height} width={width} x={x} y={y}>
        <div
          data-region-tooltip
          style={{
            boxSizing: "border-box",
            padding: "10px 12px",
            color: "white",
            fontFamily: "Ubuntu, system-ui, sans-serif",
            fontSize: 12,
            lineHeight: "18px",
          }}
        >
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 14,
              fontWeight: 600,
            }}
            title={label}
          >
            {label}
          </p>

          {outsideUniverse ? (
            <p style={{ margin: "6px 0 0", opacity: 0.8 }}>{description}</p>
          ) : (
            <>
              <p
                style={{
                  margin: "6px 0 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={result}
              >
                Elementos: {result}
              </p>

              <p style={{ margin: 0 }}>Cardinalidad: {elements.length}</p>

              <p
                style={{
                  margin: 0,
                  opacity: 0.75,
                  fontSize: 11,
                }}
              >
                {description}
              </p>
            </>
          )}
        </div>
      </foreignObject>
    </g>
  );
}
