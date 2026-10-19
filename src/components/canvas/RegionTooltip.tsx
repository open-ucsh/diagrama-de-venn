import type { UniverseBounds } from "@/components/canvas/canvas-geometry";
import { formatElementLabels } from "@/domain/venn/elements";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

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
  const width = 260;
  const height = 62;

  const x = Math.max(
    12,
    Math.min(bounds.x + bounds.width - width, VENN_CANVAS_SIZE.width - width - 12),
  );

  const y = Math.max(12, bounds.y - height - 10);

  const label = outsideUniverse
    ? "Fuera del universo U"
    : outsideSets
      ? "Fuera de los conjuntos"
      : formula || "U";

  const content = outsideUniverse
    ? "Este espacio no pertenece a U"
    : `${formatElementLabels(elements)} · ${elements.length} ${
        elements.length === 1 ? "elemento" : "elementos"
      }`;

  return (
    <g aria-hidden="true" data-export-ignore pointerEvents="none">
      <title>{`${label}. ${content}`}</title>

      <foreignObject height={height} width={width} x={x} y={y}>
        <div className="venn-region-tooltip" data-region-tooltip>
          <p className="truncate text-xs font-semibold" title={label}>
            {label}
          </p>

          <p className="mt-1 truncate text-xs text-text-muted" title={content}>
            {content}
          </p>
        </div>
      </foreignObject>
    </g>
  );
}
