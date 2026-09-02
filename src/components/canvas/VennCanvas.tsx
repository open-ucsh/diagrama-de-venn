import type { MouseEvent, SVGProps } from "react";

import { getSetRadii, isEllipseSet, VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

import type { Point, VennSet } from "@/domain/venn/models";

import { getRegionAtPoint } from "@/domain/venn/regions";
import { useVennStore } from "@/state/venn-store";

import { VennRegionFill } from "./VennRegionFill";

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
  {
    fillClassName: "fill-emerald-500/10",

    strokeClassName: "stroke-emerald-600",

    textClassName: "fill-emerald-700",
  },
] as const;

interface SetShapeProps {
  set: VennSet;
  className?: string;
  fill?: SVGProps<SVGCircleElement>["fill"];
  strokeWidth?: number;
}

function SetShape({ set, className, fill, strokeWidth }: SetShapeProps) {
  if (isEllipseSet(set)) {
    const { radiusX, radiusY } = getSetRadii(set);

    return (
      <ellipse
        className={className}
        cx={set.position.x}
        cy={set.position.y}
        fill={fill}
        rx={radiusX}
        ry={radiusY}
        strokeWidth={strokeWidth}
        transform={`rotate(${set.rotation ?? 0} ${set.position.x} ${set.position.y})`}
      />
    );
  }

  return (
    <circle
      className={className}
      cx={set.position.x}
      cy={set.position.y}
      fill={fill}
      r={set.radius}
      strokeWidth={strokeWidth}
    />
  );
}

function getCanvasPoint(event: MouseEvent<SVGSVGElement>): Point | null {
  const svg = event.currentTarget;
  const screenMatrix = svg.getScreenCTM();

  if (!screenMatrix) {
    return null;
  }

  const screenPoint = svg.createSVGPoint();

  screenPoint.x = event.clientX;
  screenPoint.y = event.clientY;

  const canvasPoint = screenPoint.matrixTransform(screenMatrix.inverse());

  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
  };
}

function getBoundaryDistance(set: VennSet, direction: Point): number {
  if (!isEllipseSet(set)) {
    return set.radius;
  }

  const { radiusX, radiusY } = getSetRadii(set);

  const directionLength = Math.hypot(direction.x, direction.y) || 1;

  const unitX = direction.x / directionLength;

  const unitY = direction.y / directionLength;

  const rotation = ((set.rotation ?? 0) * Math.PI) / 180;

  const localX = unitX * Math.cos(rotation) + unitY * Math.sin(rotation);

  const localY = -unitX * Math.sin(rotation) + unitY * Math.cos(rotation);

  return (
    1 / Math.sqrt((localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY))
  );
}

function getSetLabelPosition(sets: VennSet[], setIndex: number): Point {
  const set = sets[setIndex];

  if (!set) {
    return {
      x: 0,
      y: 0,
    };
  }

  const otherSets = sets.filter((_, index) => index !== setIndex);

  if (otherSets.length === 0) {
    return {
      x: set.position.x,
      y: set.position.y - set.radius * 0.68,
    };
  }

  const otherCenter = {
    x: otherSets.reduce((total, currentSet) => total + currentSet.position.x, 0) / otherSets.length,

    y: otherSets.reduce((total, currentSet) => total + currentSet.position.y, 0) / otherSets.length,
  };

  const direction = {
    x: set.position.x - otherCenter.x,

    y: set.position.y - otherCenter.y,
  };

  const directionLength = Math.hypot(direction.x, direction.y) || 1;

  const boundaryDistance = getBoundaryDistance(set, direction);

  const labelDistance = boundaryDistance * 0.72;

  return {
    x: set.position.x + (direction.x / directionLength) * labelDistance,

    y: set.position.y + (direction.y / directionLength) * labelDistance,
  };
}

export function VennCanvas() {
  const diagram = useVennStore((state) => state.diagram);

  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);

  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point) {
      return;
    }

    const region = getRegionAtPoint(diagram, point);

    toggleRegionSelection(region.id);
  }

  return (
    <svg
      aria-label="Diagrama de Venn interactivo"
      className="canvas-grid block h-full w-auto max-w-full cursor-crosshair overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      height={VENN_CANVAS_SIZE.height}
      onClick={handleCanvasClick}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      viewBox={`0 0 ${VENN_CANVAS_SIZE.width} ${VENN_CANVAS_SIZE.height}`}
      width={VENN_CANVAS_SIZE.width}
    >
      <rect
        className="fill-transparent"
        height={VENN_CANVAS_SIZE.height}
        width={VENN_CANVAS_SIZE.width}
      />

      <g pointerEvents="none">
        {diagram.sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          return <SetShape className={style.fillClassName} key={set.id} set={set} />;
        })}
      </g>

      <VennRegionFill diagram={diagram} selectedRegionIds={selectedRegionIds} />

      <g pointerEvents="none">
        {diagram.sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          const labelPosition = getSetLabelPosition(diagram.sets, index);

          return (
            <g key={set.id}>
              <SetShape className={style.strokeClassName} fill="none" set={set} strokeWidth={4} />

              <text
                className={`${style.textClassName} text-3xl font-bold`}
                dominantBaseline="middle"
                paintOrder="stroke"
                stroke="white"
                strokeOpacity="0.9"
                strokeWidth="6"
                textAnchor="middle"
                x={labelPosition.x}
                y={labelPosition.y}
              >
                {set.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
