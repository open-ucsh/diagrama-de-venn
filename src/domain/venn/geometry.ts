import type { Point, VennSet } from "@/domain/venn/models";

export const VENN_CANVAS_SIZE = {
  height: 600,
  width: 900,
} as const;

const GEOMETRY_TOLERANCE = 0.000001;
const ELLIPSE_SAMPLE_COUNT = 240;
const COMMON_INTERSECTION_SAMPLE_COUNT = 120;
const COMMON_INTERSECTION_STEP = 3;

interface SetRadii {
  radiusX: number;
  radiusY: number;
}

interface SetBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getRotationRadians(set: VennSet): number {
  return ((set.rotation ?? 0) * Math.PI) / 180;
}

export function isEllipseSet(set: VennSet): boolean {
  return set.shape === "ellipse";
}

export function getSetRadii(set: VennSet): SetRadii {
  if (isEllipseSet(set)) {
    return {
      radiusX: set.radiusX ?? set.radius,
      radiusY: set.radiusY ?? set.radius,
    };
  }

  return {
    radiusX: set.radius,
    radiusY: set.radius,
  };
}

export function getSetBounds(set: VennSet): SetBounds {
  const { radiusX, radiusY } = getSetRadii(set);

  let halfWidth = radiusX;
  let halfHeight = radiusY;

  if (isEllipseSet(set)) {
    const rotation = getRotationRadians(set);
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);

    halfWidth = Math.hypot(radiusX * cosine, radiusY * sine);
    halfHeight = Math.hypot(radiusX * sine, radiusY * cosine);
  }

  return {
    left: set.position.x - halfWidth,
    right: set.position.x + halfWidth,
    top: set.position.y - halfHeight,
    bottom: set.position.y + halfHeight,
  };
}

export function clampSetPosition(set: VennSet, position: Point): Point {
  const bounds = getSetBounds(set);
  const horizontalExtent = (bounds.right - bounds.left) / 2;
  const verticalExtent = (bounds.bottom - bounds.top) / 2;

  return {
    x: clamp(position.x, horizontalExtent, VENN_CANVAS_SIZE.width - horizontalExtent),
    y: clamp(position.y, verticalExtent, VENN_CANVAS_SIZE.height - verticalExtent),
  };
}

export function isPointInsideSet(point: Point, set: VennSet): boolean {
  if (!isEllipseSet(set)) {
    return getDistance(point, set.position) <= set.radius + GEOMETRY_TOLERANCE;
  }

  const { radiusX, radiusY } = getSetRadii(set);
  const rotation = getRotationRadians(set);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const differenceX = point.x - set.position.x;
  const differenceY = point.y - set.position.y;

  const localX = differenceX * cosine + differenceY * sine;
  const localY = -differenceX * sine + differenceY * cosine;

  const normalizedDistance = (localX / radiusX) ** 2 + (localY / radiusY) ** 2;

  return normalizedDistance <= 1 + GEOMETRY_TOLERANCE;
}

function getEllipseBoundaryPoints(set: VennSet, sampleCount = ELLIPSE_SAMPLE_COUNT): Point[] {
  const { radiusX, radiusY } = getSetRadii(set);
  const rotation = getRotationRadians(set);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return Array.from({ length: sampleCount }, (_, index) => {
    const angle = (index / sampleCount) * Math.PI * 2;
    const localX = radiusX * Math.cos(angle);
    const localY = radiusY * Math.sin(angle);

    return {
      x: set.position.x + localX * cosine - localY * sine,
      y: set.position.y + localX * sine + localY * cosine,
    };
  });
}

function getCircleIntersectionPoints(first: VennSet, second: VennSet): Point[] {
  const dx = second.position.x - first.position.x;
  const dy = second.position.y - first.position.y;
  const distance = Math.hypot(dx, dy);

  if (
    distance === 0 ||
    distance > first.radius + second.radius + GEOMETRY_TOLERANCE ||
    distance < Math.abs(first.radius - second.radius) - GEOMETRY_TOLERANCE
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

export function setsIntersect(first: VennSet, second: VennSet): boolean {
  if (!isEllipseSet(first) && !isEllipseSet(second)) {
    return (
      getDistance(first.position, second.position) <=
      first.radius + second.radius + GEOMETRY_TOLERANCE
    );
  }

  if (isPointInsideSet(first.position, second) || isPointInsideSet(second.position, first)) {
    return true;
  }

  // El muestreo puede omitir tangencias o intersecciones muy pequeñas.
  return (
    getEllipseBoundaryPoints(first).some((point) => isPointInsideSet(point, second)) ||
    getEllipseBoundaryPoints(second).some((point) => isPointInsideSet(point, first))
  );
}

function getCommonBounds(sets: readonly VennSet[]): SetBounds {
  const bounds = sets.map(getSetBounds);

  return {
    left: Math.max(...bounds.map((current) => current.left)),
    right: Math.min(...bounds.map((current) => current.right)),
    top: Math.max(...bounds.map((current) => current.top)),
    bottom: Math.min(...bounds.map((current) => current.bottom)),
  };
}

function isPointInsideEverySet(point: Point, sets: readonly VennSet[]): boolean {
  return sets.every((set) => isPointInsideSet(point, set));
}

function ellipseSetsHaveCommonIntersection(sets: readonly VennSet[]): boolean {
  const bounds = getCommonBounds(sets);

  if (bounds.left > bounds.right || bounds.top > bounds.bottom) {
    return false;
  }

  for (const set of sets) {
    if (isPointInsideEverySet(set.position, sets)) {
      return true;
    }
  }

  for (const set of sets) {
    const boundary = getEllipseBoundaryPoints(set, COMMON_INTERSECTION_SAMPLE_COUNT);

    if (boundary.some((point) => isPointInsideEverySet(point, sets))) {
      return true;
    }
  }

  // La cuadrícula complementa el muestreo del borde; no garantiza exactitud.
  for (let y = bounds.top; y <= bounds.bottom; y += COMMON_INTERSECTION_STEP) {
    for (let x = bounds.left; x <= bounds.right; x += COMMON_INTERSECTION_STEP) {
      if (isPointInsideEverySet({ x, y }, sets)) {
        return true;
      }
    }
  }

  return false;
}

export function setsHaveCommonIntersection(sets: VennSet[]): boolean {
  if (sets.length === 0) {
    return false;
  }

  if (sets.length === 1) {
    return true;
  }

  if (sets.some(isEllipseSet)) {
    return ellipseSetsHaveCommonIntersection(sets);
  }

  for (const set of sets) {
    if (isPointInsideEverySet(set.position, sets)) {
      return true;
    }
  }

  for (const [firstIndex, first] of sets.entries()) {
    for (const second of sets.slice(firstIndex + 1)) {
      const intersections = getCircleIntersectionPoints(first, second);

      if (intersections.some((point) => isPointInsideEverySet(point, sets))) {
        return true;
      }
    }
  }

  return false;
}
