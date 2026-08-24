import type { Point, VennSet } from "./models";

export const VENN_CANVAS_SIZE = {
  height: 600,
  width: 900,
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function clampSetPosition(set: VennSet, position: Point): Point {
  return {
    x: clamp(position.x, set.radius, VENN_CANVAS_SIZE.width - set.radius),
    y: clamp(position.y, set.radius, VENN_CANVAS_SIZE.height - set.radius),
  };
}
