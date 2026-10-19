import { describe, expect, it } from "vitest";

import { clampSetPosition } from "@/domain/venn/geometry";
import type { VennSet } from "@/domain/venn/models";

const set: VennSet = {
  id: "set-a",
  name: "A",
  position: { x: 340, y: 300 },
  radius: 160,
};

describe("Geometría de Venn", () => {
  it.each([
    {
      boundary: "izquierdo",
      position: { x: 20, y: 300 },
      expected: { x: 160, y: 300 },
    },
    {
      boundary: "superior",
      position: { x: 340, y: 40 },
      expected: { x: 340, y: 160 },
    },
    {
      boundary: "derecho",
      position: { x: 850, y: 300 },
      expected: { x: 740, y: 300 },
    },
    {
      boundary: "inferior",
      position: { x: 340, y: 550 },
      expected: { x: 340, y: 440 },
    },
    {
      boundary: "superior izquierdo",
      position: { x: 20, y: 40 },
      expected: { x: 160, y: 160 },
    },
    {
      boundary: "inferior derecho",
      position: { x: 850, y: 550 },
      expected: { x: 740, y: 440 },
    },
  ])("mantiene el conjunto dentro del límite $boundary", ({ position, expected }) => {
    expect(clampSetPosition(set, position)).toEqual(expected);
  });

  it("conserva una posición válida", () => {
    const position = { x: 400, y: 350 };

    expect(clampSetPosition(set, position)).toEqual(position);
  });
});
