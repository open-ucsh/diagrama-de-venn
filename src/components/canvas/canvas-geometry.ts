import { getSetBounds, getSetRadii, isEllipseSet, VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";

const UNIVERSE_PADDING = 28;

export interface UniverseBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getUniverseBounds(sets: VennSet[]): UniverseBounds {
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

export function isPointInsideUniverse(point: Point, bounds: UniverseBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
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

export function getSetLabelPosition(sets: VennSet[], setIndex: number): Point {
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
