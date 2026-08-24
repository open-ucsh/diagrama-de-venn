import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { addSet } from "@/domain/venn/operations";
import { getRegionLabel, getVennRegions } from "@/domain/venn/regions";

describe("Venn regions", () => {
  it("creates four regions for two sets", () => {
    const diagram = createInitialDiagram();

    const regions = getVennRegions(diagram);

    expect(regions).toHaveLength(4);
    expect(regions.map((region) => region.id)).toEqual([
      "outside",
      "region:set-a",
      "region:set-b",
      "region:set-a:set-b",
    ]);
  });

  it("creates eight regions for three sets", () => {
    const setC = createVennSet("C", { x: 420, y: 450 });
    const diagram = addSet(createInitialDiagram(), setC);

    const regions = getVennRegions(diagram);

    expect(regions).toHaveLength(8);
    expect(regions.at(-1)?.setIds).toEqual(["set-a", "set-b", setC.id]);
  });

  it("creates readable labels for regions", () => {
    const diagram = createInitialDiagram();
    const regions = getVennRegions(diagram);

    expect(getRegionLabel(diagram, regions[0]!)).toBe("Exterior");
    expect(getRegionLabel(diagram, regions[1]!)).toBe("Solo A");
    expect(getRegionLabel(diagram, regions[3]!)).toBe("A ∩ B");
  });
});
