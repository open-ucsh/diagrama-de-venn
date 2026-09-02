import type { Point, VennSet } from "./models";

export const VENN_CANVAS_SIZE = {
  height: 600,
  width: 900,
} as const;

const GEOMETRY_TOLERANCE = 0.000001;
const ELLIPSE_SAMPLE_COUNT = 240;
const COMMON_INTERSECTION_STEP = 3;

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

export function getSetRadii(set: VennSet) {
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

export function getSetBounds(set: VennSet) {
  const { radiusX, radiusY } = getSetRadii(set);

  if (!isEllipseSet(set)) {
    return {
      left: set.position.x - radiusX,
      right: set.position.x + radiusX,
      top: set.position.y - radiusY,
      bottom: set.position.y + radiusY,
    };
  }

  const rotation = getRotationRadians(set);

  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  const halfWidth = Math.sqrt(radiusX ** 2 * cosine ** 2 + radiusY ** 2 * sine ** 2);

  const halfHeight = Math.sqrt(radiusX ** 2 * sine ** 2 + radiusY ** 2 * cosine ** 2);

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

  const differenceX = point.x - set.position.x;

  const differenceY = point.y - set.position.y;

  const localX = differenceX * Math.cos(rotation) + differenceY * Math.sin(rotation);

  const localY = -differenceX * Math.sin(rotation) + differenceY * Math.cos(rotation);

  const normalizedDistance =
    (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY);

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

function circleSetsIntersect(first: VennSet, second: VennSet): boolean {
  const distance = getDistance(first.position, second.position);

  return distance <= first.radius + second.radius + GEOMETRY_TOLERANCE;
}

export function setsIntersect(first: VennSet, second: VennSet): boolean {
  if (!isEllipseSet(first) && !isEllipseSet(second)) {
    return circleSetsIntersect(first, second);
  }

  if (isPointInsideSet(first.position, second) || isPointInsideSet(second.position, first)) {
    return true;
  }

  const firstBoundary = getEllipseBoundaryPoints(first);

  if (firstBoundary.some((point) => isPointInsideSet(point, second))) {
    return true;
  }

  return getEllipseBoundaryPoints(second).some((point) => isPointInsideSet(point, first));
}

function getCommonBounds(sets: VennSet[]) {
  const bounds = sets.map(getSetBounds);

  return {
    left: Math.max(...bounds.map((currentBounds) => currentBounds.left)),

    right: Math.min(...bounds.map((currentBounds) => currentBounds.right)),

    top: Math.max(...bounds.map((currentBounds) => currentBounds.top)),

    bottom: Math.min(...bounds.map((currentBounds) => currentBounds.bottom)),
  };
}

function ellipseSetsHaveCommonIntersection(sets: VennSet[]): boolean {
  const commonBounds = getCommonBounds(sets);

  if (commonBounds.left > commonBounds.right || commonBounds.top > commonBounds.bottom) {
    return false;
  }

  const candidates: Point[] = [
    ...sets.map((set) => set.position),

    ...sets.flatMap((set) => getEllipseBoundaryPoints(set, 120)),
  ];

  if (candidates.some((point) => sets.every((set) => isPointInsideSet(point, set)))) {
    return true;
  }

  for (let y = commonBounds.top; y <= commonBounds.bottom; y += COMMON_INTERSECTION_STEP) {
    for (let x = commonBounds.left; x <= commonBounds.right; x += COMMON_INTERSECTION_STEP) {
      const point = { x, y };

      if (sets.every((set) => isPointInsideSet(point, set))) {
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

  const containsEllipse = sets.some(isEllipseSet);

  if (containsEllipse) {
    return ellipseSetsHaveCommonIntersection(sets);
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
