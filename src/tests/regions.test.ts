import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { addSet } from "@/domain/venn/operations";
import { getRegionLabel, getVennRegions } from "@/domain/venn/regions";

describe("Regiones de Venn", () => {
  it("genera las cuatro regiones de un diagrama con dos conjuntos", () => {
    const diagram = createInitialDiagram();

    const regions = getVennRegions(diagram);

    expect(regions.map((region) => region.id)).toEqual([
      "outside",
      "region:set-a",
      "region:set-b",
      "region:set-a:set-b",
    ]);
  });

  it("genera ocho regiones para tres conjuntos e incluye su intersección completa", () => {
    const set = createVennSet("C", { x: 420, y: 450 });
    const diagram = addSet(createInitialDiagram(), set);

    const regions = getVennRegions(diagram);

    expect(regions).toHaveLength(8);
    expect(regions.at(-1)?.setIds).toEqual(["set-a", "set-b", set.id]);
  });

  it.each([
    ["outside", "Exterior"],
    ["region:set-a", "Solo A"],
    ["region:set-a:set-b", "A ∩ B"],
  ])("asigna a la región %s la etiqueta %s", (regionId, expectedLabel) => {
    const diagram = createInitialDiagram();
    const region = getVennRegions(diagram).find((current) => current.id === regionId);

    if (!region) {
      throw new Error(`No se encontró la región "${regionId}".`);
    }

    expect(getRegionLabel(diagram, region)).toBe(expectedLabel);
  });
});
