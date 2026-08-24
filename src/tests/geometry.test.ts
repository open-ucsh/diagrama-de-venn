import { describe, expect, it } from "vitest";

import { clampSetPosition } from "@/domain/venn/geometry";
import type { VennSet } from "@/domain/venn/models";

const set: VennSet = {
  id: "set-a",
  name: "A",
  position: { x: 340, y: 300 },
  radius: 160,
};

describe("Venn geometry", () => {
  it("keeps a set inside the left and top canvas limits", () => {
    const position = clampSetPosition(set, { x: 20, y: 40 });

    expect(position).toEqual({ x: 160, y: 160 });
  });

  it("keeps a set inside the right and bottom canvas limits", () => {
    const position = clampSetPosition(set, { x: 850, y: 550 });

    expect(position).toEqual({ x: 740, y: 440 });
  });

  it("keeps a valid position unchanged", () => {
    const position = clampSetPosition(set, { x: 400, y: 350 });

    expect(position).toEqual({ x: 400, y: 350 });
  });
});
