import type { SVGProps } from "react";

import { getSetRadii, isEllipseSet } from "@/domain/venn/geometry";
import type { VennSet } from "@/domain/venn/models";

type ShapeStyleProps = Pick<
  SVGProps<SVGCircleElement>,
  "fill" | "fillOpacity" | "stroke" | "strokeWidth"
>;

interface SetShapeProps extends ShapeStyleProps {
  set: VennSet;
}

export function SetShape({ set, ...styleProps }: SetShapeProps) {
  const { x, y } = set.position;

  if (!isEllipseSet(set)) {
    return <circle {...styleProps} cx={x} cy={y} r={set.radius} />;
  }

  const { radiusX, radiusY } = getSetRadii(set);

  return (
    <ellipse
      {...styleProps}
      cx={x}
      cy={y}
      rx={radiusX}
      ry={radiusY}
      transform={`rotate(${set.rotation ?? 0} ${x} ${y})`}
    />
  );
}
