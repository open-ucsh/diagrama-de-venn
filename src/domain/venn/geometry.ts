import type { Point, VennSet } from "./models";

export const VENN_CANVAS_SIZE = {
  height: 600,
  width: 900,
} as const;

const GEOMETRY_TOLERANCE = 0.000001;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function clampSetPosition(set: VennSet, position: Point): Point {
  return {
    x: clamp(position.x, set.radius, VENN_CANVAS_SIZE.width - set.radius),
    y: clamp(position.y, set.radius, VENN_CANVAS_SIZE.height - set.radius),
  };
}

export function isPointInsideSet(point: Point, set: VennSet): boolean {
  return getDistance(point, set.position) <= set.radius + GEOMETRY_TOLERANCE;
}

export function setsIntersect(first: VennSet, second: VennSet): boolean {
  const distance = getDistance(first.position, second.position);

  return distance <= first.radius + second.radius + GEOMETRY_TOLERANCE;
}

function getCircleIntersectionPoints(first: VennSet, second: VennSet): Point[] {
  const dx = second.position.x - first.position.x;
  const dy = second.position.y - first.position.y;
  const distance = Math.hypot(dx, dy);

  if (
    distance > first.radius + second.radius + GEOMETRY_TOLERANCE ||
    distance < Math.abs(first.radius - second.radius) - GEOMETRY_TOLERANCE ||
    distance === 0
  ) {
    return [];
  }

  const distanceToMiddle =
    (first.radius ** 2 - second.radius ** 2 + distance ** 2) / (2 * distance);

  const heightSquared = first.radius ** 2 - distanceToMiddle ** 2;

  const height = Math.sqrt(Math.max(0, heightSquared));

  const middle = {
    x: first.position.x + (distanceToMiddle * dx) / distance,
    y: first.position.y + (distanceToMiddle * dy) / distance,
  };

  const offset = {
    x: (-dy * height) / distance,
    y: (dx * height) / distance,
  };

  const firstPoint = {
    x: middle.x + offset.x,
    y: middle.y + offset.y,
  };

  if (height <= GEOMETRY_TOLERANCE) {
    return [firstPoint];
  }

  return [
    firstPoint,
    {
      x: middle.x - offset.x,
      y: middle.y - offset.y,
    },
  ];
}

export function setsHaveCommonIntersection(sets: VennSet[]): boolean {
  if (sets.length === 0) {
    return false;
  }

  if (sets.length === 1) {
    return true;
  }

  const centers = sets.map((set) => set.position);

  const intersectionPoints = sets.flatMap((first, firstIndex) =>
    sets.flatMap((second, secondIndex) =>
      firstIndex < secondIndex ? getCircleIntersectionPoints(first, second) : [],
    ),
  );

  return [...centers, ...intersectionPoints].some((point) =>
    sets.every((set) => isPointInsideSet(point, set)),
  );
}
