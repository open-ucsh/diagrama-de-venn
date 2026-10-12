import type { SVGProps } from "react";

import { getSetRadii, isEllipseSet } from "@/domain/venn/geometry";
import type { VennSet } from "@/domain/venn/models";

interface SetShapeProps {
  set: VennSet;
  fill?: SVGProps<SVGCircleElement>["fill"];
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

export function SetShape({ set, fill, fillOpacity, stroke, strokeWidth }: SetShapeProps) {
  if (isEllipseSet(set)) {
    const { radiusX, radiusY } = getSetRadii(set);

    return (
      <ellipse
        cx={set.position.x}
        cy={set.position.y}
        fill={fill}
        fillOpacity={fillOpacity}
        rx={radiusX}
        ry={radiusY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        transform={`rotate(${set.rotation ?? 0} ${set.position.x} ${set.position.y})`}
      />
    );
  }

  return (
    <circle
      cx={set.position.x}
      cy={set.position.y}
      fill={fill}
      fillOpacity={fillOpacity}
      r={set.radius}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}
