import { getSetBounds, getSetRadii, isEllipseSet, VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";

const UNIVERSE_PADDING = 28;
const UNIVERSE_MARGIN = 12;
const EMPTY_UNIVERSE_MARGIN = 24;
const LABEL_DISTANCE_RATIO = 0.72;
const SINGLE_SET_LABEL_DISTANCE_RATIO = 0.68;

export interface UniverseBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getUniverseBounds(sets: readonly VennSet[]): UniverseBounds {
  if (sets.length === 0) {
    return {
      x: EMPTY_UNIVERSE_MARGIN,
      y: EMPTY_UNIVERSE_MARGIN,
      width: VENN_CANVAS_SIZE.width - EMPTY_UNIVERSE_MARGIN * 2,
      height: VENN_CANVAS_SIZE.height - EMPTY_UNIVERSE_MARGIN * 2,
    };
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const set of sets) {
    const bounds = getSetBounds(set);

    left = Math.min(left, bounds.left);
    right = Math.max(right, bounds.right);
    top = Math.min(top, bounds.top);
    bottom = Math.max(bottom, bounds.bottom);
  }

  const x = Math.max(UNIVERSE_MARGIN, left - UNIVERSE_PADDING);
  const y = Math.max(UNIVERSE_MARGIN, top - UNIVERSE_PADDING);

  const rightEdge = Math.min(VENN_CANVAS_SIZE.width - UNIVERSE_MARGIN, right + UNIVERSE_PADDING);
  const bottomEdge = Math.min(VENN_CANVAS_SIZE.height - UNIVERSE_MARGIN, bottom + UNIVERSE_PADDING);

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

function normalizeDirection(direction: Point): Point {
  const length = Math.hypot(direction.x, direction.y);

  if (length === 0) {
    return { x: 0, y: -1 };
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
  };
}

function getBoundaryDistance(set: VennSet, unitDirection: Point): number {
  if (!isEllipseSet(set)) {
    return set.radius;
  }

  const { radiusX, radiusY } = getSetRadii(set);
  const rotation = ((set.rotation ?? 0) * Math.PI) / 180;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  const localX = unitDirection.x * cosine + unitDirection.y * sine;
  const localY = -unitDirection.x * sine + unitDirection.y * cosine;

  return 1 / Math.hypot(localX / radiusX, localY / radiusY);
}

export function getSetLabelPosition(sets: readonly VennSet[], setIndex: number): Point {
  const set = sets[setIndex];

  if (!set) {
    return { x: 0, y: 0 };
  }

  const otherSets = sets.filter((_, index) => index !== setIndex);
  let direction: Point = { x: 0, y: -1 };

  if (otherSets.length > 0) {
    let totalX = 0;
    let totalY = 0;

    for (const otherSet of otherSets) {
      totalX += otherSet.position.x;
      totalY += otherSet.position.y;
    }

    direction = normalizeDirection({
      x: set.position.x - totalX / otherSets.length,
      y: set.position.y - totalY / otherSets.length,
    });
  }

  const distanceRatio =
    otherSets.length === 0 ? SINGLE_SET_LABEL_DISTANCE_RATIO : LABEL_DISTANCE_RATIO;

  const distance = getBoundaryDistance(set, direction) * distanceRatio;

  return {
    x: set.position.x + direction.x * distance,
    y: set.position.y + direction.y * distance,
  };
}
