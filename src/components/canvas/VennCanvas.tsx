import type { MouseEvent } from "react";

import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

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
] as const;

function getCanvasPoint(event: MouseEvent<SVGSVGElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * VENN_CANVAS_SIZE.width,

    y: ((event.clientY - bounds.top) / bounds.height) * VENN_CANVAS_SIZE.height,
  };
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

  const labelDistance = set.radius * 0.68;

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

    const region = getRegionAtPoint(diagram, point);

    toggleRegionSelection(region.id);
  }

  return (
    <svg
      aria-label="Diagrama de Venn interactivo"
      className="canvas-grid block h-full w-auto max-w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
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

      {/* Colores normales de los conjuntos */}
      <g pointerEvents="none">
        {diagram.sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          return (
            <circle
              className={style.fillClassName}
              cx={set.position.x}
              cy={set.position.y}
              key={set.id}
              r={set.radius}
            />
          );
        })}
      </g>

      {/* Color aplicado únicamente a las regiones seleccionadas */}
      <VennRegionFill diagram={diagram} selectedRegionIds={selectedRegionIds} />

      {/* Bordes y nombres sin cambios visuales */}
      <g pointerEvents="none">
        {diagram.sets.map((set, index) => {
          const style = SET_STYLES[index];

          if (!style) {
            return null;
          }

          const labelPosition = getSetLabelPosition(diagram.sets, index);

          return (
            <g key={set.id}>
              <circle
                className={style.strokeClassName}
                cx={set.position.x}
                cy={set.position.y}
                fill="none"
                r={set.radius}
                strokeWidth={4}
              />

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
