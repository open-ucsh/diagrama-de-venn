import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { UniverseBounds } from "./canvas-geometry";

interface RegionTooltipProps {
  formula: string;
  bounds: UniverseBounds;
}

export function RegionTooltip({ formula, bounds }: RegionTooltipProps) {
  const label = formula || "Exterior";
  const width = Math.min(Math.max(label.length * 9 + 34, 150), 300);
  const x = Math.max(
    12,
    Math.min(bounds.x + bounds.width - width, VENN_CANVAS_SIZE.width - width - 12),
  );
  const y = Math.max(8, bounds.y - 52);
  const anchorX = bounds.x + bounds.width;
  const anchorY = bounds.y;

  return (
    <g aria-hidden="true" data-export-ignore pointerEvents="none">
      <line
        stroke="#12376b"
        strokeOpacity="0.55"
        strokeWidth="1"
        x1={x + width - 12}
        x2={anchorX}
        y1={y + 42}
        y2={anchorY}
      />
      <circle cx={anchorX} cy={anchorY} fill="#12376b" r="4" />
      <rect fill="#12376b" height="42" rx="5" width={width} x={x} y={y} />
      <text
        fill="white"
        fontFamily="Ubuntu, system-ui, sans-serif"
        fontSize="10"
        fontWeight="700"
        letterSpacing="1"
        x={x + 12}
        y={y + 15}
      >
        REGIÓN
      </text>
      <text
        fill="white"
        fontFamily="Ubuntu, system-ui, sans-serif"
        fontSize="14"
        fontWeight="600"
        x={x + 12}
        y={y + 32}
      >
        {label}
      </text>
    </g>
  );
}
