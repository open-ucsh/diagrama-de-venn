import type { Point, VennSet } from "@/domain/venn/models";

const DEFAULT_SET_NAMES = ["A", "B", "C", "D"] as const;

const DEFAULT_SET_POSITIONS: Point[] = [
  { x: 370, y: 300 },
  { x: 530, y: 300 },
  { x: 450, y: 420 },
  { x: 450, y: 300 },
];

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getMinimumDistance(position: Point, sets: VennSet[]): number {
  if (sets.length === 0) return Number.POSITIVE_INFINITY;

  return Math.min(...sets.map((set) => getDistance(position, set.position)));
}

export function getNextSetPosition(sets: VennSet[]): Point {
  const [firstPosition, ...remainingPositions] = DEFAULT_SET_POSITIONS;

  if (!firstPosition) return { x: 450, y: 300 };

  return remainingPositions.reduce((bestPosition, candidatePosition) => {
    const bestDistance = getMinimumDistance(bestPosition, sets);
    const candidateDistance = getMinimumDistance(candidatePosition, sets);

    return candidateDistance > bestDistance ? candidatePosition : bestPosition;
  }, firstPosition);
}

export function getNextSetName(sets: VennSet[]): string {
  const usedNames = new Set(sets.map((set) => set.name.trim().replace(/\s+/g, " ").toLowerCase()));

  const availableName = DEFAULT_SET_NAMES.find((name) => !usedNames.has(name.toLowerCase()));

  if (availableName) return availableName;

  let index = sets.length + 1;

  while (usedNames.has(`conjunto ${index}`)) {
    index += 1;
  }

  return `Conjunto ${index}`;
}
