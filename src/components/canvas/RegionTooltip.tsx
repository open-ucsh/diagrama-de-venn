import type { UniverseBounds } from "@/components/canvas/canvas-geometry";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

const TOOLTIP_COLOR = "#12376b";
const TOOLTIP_HEIGHT = 42;
const TOOLTIP_MIN_WIDTH = 150;
const TOOLTIP_MAX_WIDTH = 300;
const TOOLTIP_HORIZONTAL_PADDING = 12;
const TOOLTIP_TOP_MARGIN = 8;
const TOOLTIP_OFFSET = 52;

interface RegionTooltipProps {
  formula: string;
  bounds: UniverseBounds;
}

export function RegionTooltip({ formula, bounds }: RegionTooltipProps) {
  const label = formula || "Exterior";
  const width = Math.min(Math.max(label.length * 9 + 34, TOOLTIP_MIN_WIDTH), TOOLTIP_MAX_WIDTH);

  const x = Math.max(
    TOOLTIP_HORIZONTAL_PADDING,
    Math.min(
      bounds.x + bounds.width - width,
      VENN_CANVAS_SIZE.width - width - TOOLTIP_HORIZONTAL_PADDING,
    ),
  );
  const y = Math.max(TOOLTIP_TOP_MARGIN, bounds.y - TOOLTIP_OFFSET);
  const anchorX = bounds.x + bounds.width;
  const anchorY = bounds.y;

  return (
    <g aria-hidden="true" data-export-ignore pointerEvents="none">
      <line
        stroke={TOOLTIP_COLOR}
        strokeOpacity={0.55}
        strokeWidth={1}
        x1={x + width - TOOLTIP_HORIZONTAL_PADDING}
        x2={anchorX}
        y1={y + TOOLTIP_HEIGHT}
        y2={anchorY}
      />

      <circle cx={anchorX} cy={anchorY} fill={TOOLTIP_COLOR} r={4} />

      <rect fill={TOOLTIP_COLOR} height={TOOLTIP_HEIGHT} rx={5} width={width} x={x} y={y} />

      <text
        fill="white"
        fontFamily="Ubuntu, system-ui, sans-serif"
        fontSize={10}
        fontWeight={700}
        letterSpacing={1}
        x={x + TOOLTIP_HORIZONTAL_PADDING}
        y={y + 15}
      >
        REGIÓN
      </text>

      <text
        fill="white"
        fontFamily="Ubuntu, system-ui, sans-serif"
        fontSize={14}
        fontWeight={600}
        x={x + TOOLTIP_HORIZONTAL_PADDING}
        y={y + 32}
      >
        {label}
      </text>
    </g>
  );
}
