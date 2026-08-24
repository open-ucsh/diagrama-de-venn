import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "../domain/venn/factories";
import { addElement } from "../domain/venn/operations";
import { getElementsInRegion, getRegionForElement } from "../domain/venn/queries";
import { getVennRegions } from "../domain/venn/regions";

describe("Venn queries", () => {
  it("gets the elements that belong to a region", () => {
    const diagramWithElements = [
      createVennElement("Ana", ["set-a"]),
      createVennElement("Bruno", ["set-a", "set-b"]),
      createVennElement("Carla", []),
    ].reduce(addElement, createInitialDiagram());

    const regions = getVennRegions(diagramWithElements);
    const onlyARegion = regions.find((region) => region.id === "region:set-a")!;

    expect(getElementsInRegion(diagramWithElements, onlyARegion)).toEqual([
      expect.objectContaining({ label: "Ana" }),
    ]);
  });

  it("gets the intersection region of an element", () => {
    const element = createVennElement("Bruno", ["set-a", "set-b"]);
    const diagram = addElement(createInitialDiagram(), element);

    const region = getRegionForElement(diagram, element);

    expect(region.id).toBe("region:set-a:set-b");
  });

  it("gets the exterior region of an element without memberships", () => {
    const element = createVennElement("Carla", []);
    const diagram = addElement(createInitialDiagram(), element);

    const region = getRegionForElement(diagram, element);

    expect(region.id).toBe("outside");
  });
});
