import { useState, type MouseEvent, type SVGProps } from "react";

import { getSetBounds, getSetRadii, isEllipseSet, VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";
import { getRegionAtPoint, type VennRegion } from "@/domain/venn/regions";
import { useVennStore } from "@/state/venn-store";

import { VennRegionFill } from "./VennRegionFill";

const DEFAULT_COLORS = ["#d9a21b", "#168d78", "#50a9bd", "#12376b"] as const;
const UNIVERSE_PADDING = 28;

interface UniverseBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SetShapeProps {
  set: VennSet;
  fill?: SVGProps<SVGCircleElement>["fill"];
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

interface RegionTooltipProps {
  formula: string;
  bounds: UniverseBounds;
}

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_COLORS[index] ?? DEFAULT_COLORS[0];
}

function SetShape({ set, fill, fillOpacity, stroke, strokeWidth }: SetShapeProps) {
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

function getUniverseBounds(sets: VennSet[]): UniverseBounds {
  if (sets.length === 0) {
    return {
      x: 24,
      y: 24,
      width: VENN_CANVAS_SIZE.width - 48,
      height: VENN_CANVAS_SIZE.height - 48,
    };
  }

  const setBounds = sets.map(getSetBounds);
  const left = Math.min(...setBounds.map((bounds) => bounds.left));
  const right = Math.max(...setBounds.map((bounds) => bounds.right));
  const top = Math.min(...setBounds.map((bounds) => bounds.top));
  const bottom = Math.max(...setBounds.map((bounds) => bounds.bottom));

  const x = Math.max(12, left - UNIVERSE_PADDING);
  const y = Math.max(12, top - UNIVERSE_PADDING);
  const rightEdge = Math.min(VENN_CANVAS_SIZE.width - 12, right + UNIVERSE_PADDING);
  const bottomEdge = Math.min(VENN_CANVAS_SIZE.height - 12, bottom + UNIVERSE_PADDING);

  return {
    x,
    y,
    width: Math.max(0, rightEdge - x),
    height: Math.max(0, bottomEdge - y),
  };
}

function isPointInsideUniverse(point: Point, bounds: UniverseBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function getCanvasPoint(event: MouseEvent<SVGSVGElement>): Point | null {
  const svg = event.currentTarget;
  const screenMatrix = svg.getScreenCTM();

  if (!screenMatrix) return null;

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
  if (!isEllipseSet(set)) return set.radius;

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

  if (!set) return { x: 0, y: 0 };

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

function getRegionFormula(sets: VennSet[], region: VennRegion): string {
  const includedSetIds = new Set(region.setIds);

  return sets.map((set) => (includedSetIds.has(set.id) ? set.name : `${set.name}ᶜ`)).join(" ∩ ");
}

function RegionTooltip({ formula, bounds }: RegionTooltipProps) {
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

export function VennCanvas() {
  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);
  const [hoveredRegion, setHoveredRegion] = useState<VennRegion | null>(null);

  const universeBounds = getUniverseBounds(diagram.sets);

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) return;

    const region = getRegionAtPoint(diagram, point);
    toggleRegionSelection(region.id);
  }

  function handleCanvasMouseMove(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) {
      setHoveredRegion(null);
      return;
    }

    const region = getRegionAtPoint(diagram, point);

    setHoveredRegion((currentRegion) => (currentRegion?.id === region.id ? currentRegion : region));
  }

  const hoveredFormula =
    hoveredRegion === null ? null : getRegionFormula(diagram.sets, hoveredRegion);

  return (
    <svg
      aria-label="Diagrama de Venn interactivo"
      className="block h-auto w-full max-w-full touch-manipulation select-none lg:h-full lg:w-auto"
      data-venn-canvas
      height={VENN_CANVAS_SIZE.height}
      onClick={handleCanvasClick}
      onMouseLeave={() => setHoveredRegion(null)}
      onMouseMove={handleCanvasMouseMove}
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

      <rect
        className="venn-universe"
        data-universe-frame
        height={universeBounds.height}
        width={universeBounds.width}
        x={universeBounds.x}
        y={universeBounds.y}
      />

      <text className="venn-universe-label" x={universeBounds.x + 14} y={universeBounds.y + 25}>
        U
      </text>

      <g pointerEvents="none">
        {diagram.sets.map((set, index) => (
          <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
            <SetShape fill={getSetColor(set, index)} fillOpacity={0.1} set={set} />
          </g>
        ))}
      </g>

      <VennRegionFill
        diagram={diagram}
        hoveredRegionId={hoveredRegion?.id ?? null}
        selectedRegionIds={selectedRegionIds}
        universeBounds={universeBounds}
      />

      <g pointerEvents="none">
        {diagram.sets.map((set, index) => {
          const color = getSetColor(set, index);
          const labelPosition = getSetLabelPosition(diagram.sets, index);

          return (
            <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
              <SetShape fill="none" set={set} stroke={color} strokeWidth={3} />
              <text
                className="venn-set-label"
                dominantBaseline="middle"
                fill={color}
                fontSize="28"
                fontWeight="700"
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

      {hoveredFormula && <RegionTooltip bounds={universeBounds} formula={hoveredFormula} />}
    </svg>
  );
}
