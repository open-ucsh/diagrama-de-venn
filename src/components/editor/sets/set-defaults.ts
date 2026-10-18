import type { Point, VennSet } from "@/domain/venn/models";

const DEFAULT_SET_NAMES = ["A", "B", "C", "D"] as const;

const DEFAULT_SET_POSITIONS = [
  { x: 370, y: 300 },
  { x: 530, y: 300 },
  { x: 450, y: 420 },
  { x: 450, y: 300 },
] as const satisfies readonly Point[];

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function getMinimumSquaredDistance(position: Point, sets: readonly VennSet[]): number {
  let minimum = Number.POSITIVE_INFINITY;

  for (const set of sets) {
    const dx = position.x - set.position.x;
    const dy = position.y - set.position.y;

    minimum = Math.min(minimum, dx * dx + dy * dy);
  }

  return minimum;
}

export function getNextSetPosition(sets: readonly VennSet[]): Point {
  let bestPosition: Point = DEFAULT_SET_POSITIONS[0];
  let bestDistance = getMinimumSquaredDistance(bestPosition, sets);

  for (const candidate of DEFAULT_SET_POSITIONS.slice(1)) {
    const distance = getMinimumSquaredDistance(candidate, sets);

    if (distance > bestDistance) {
      bestPosition = candidate;
      bestDistance = distance;
    }
  }

  return { ...bestPosition };
}

export function getNextSetName(sets: readonly VennSet[]): string {
  const usedNames = new Set(sets.map((set) => normalizeName(set.name)));

  const availableName = DEFAULT_SET_NAMES.find((name) => !usedNames.has(normalizeName(name)));

  if (availableName) {
    return availableName;
  }

  let index = sets.length + 1;

  while (usedNames.has(`conjunto ${index}`)) {
    index += 1;
  }

  return `Conjunto ${index}`;
}
