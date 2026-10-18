import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import { addElement } from "@/domain/venn/operations";
import { getElementsInRegion, getRegionForElement } from "@/domain/venn/queries";
import { getVennRegions } from "@/domain/venn/regions";

describe("Consultas sobre diagramas de Venn", () => {
  it("devuelve únicamente los elementos de la región solicitada", () => {
    const ana = createVennElement("Ana", ["set-a"]);
    const bruno = createVennElement("Bruno", ["set-a", "set-b"]);
    const carla = createVennElement("Carla", []);
    const diagram = [ana, bruno, carla].reduce(
      (currentDiagram, element) => addElement(currentDiagram, element),
      createInitialDiagram(),
    );
    const region = getVennRegions(diagram).find((current) => current.id === "region:set-a");

    if (!region) {
      throw new Error('No se encontró la región "Solo A".');
    }

    expect(getElementsInRegion(diagram, region)).toEqual([ana]);
  });

  it("identifica la región de intersección de un elemento", () => {
    const element = createVennElement("Bruno", ["set-a", "set-b"]);
    const diagram = addElement(createInitialDiagram(), element);

    const region = getRegionForElement(diagram, element);

    expect(region.id).toBe("region:set-a:set-b");
  });

  it("asigna la región exterior a un elemento sin pertenencias", () => {
    const element = createVennElement("Carla", []);
    const diagram = addElement(createInitialDiagram(), element);

    const region = getRegionForElement(diagram, element);

    expect(region.id).toBe("outside");
  });
});
