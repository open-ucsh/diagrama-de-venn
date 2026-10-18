import type { VennDiagram, VennElement } from "@/domain/venn/models";
import { getVennRegions, type VennRegion } from "@/domain/venn/regions";

function hasSameSetIds(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const firstIds = [...first].sort();
  const secondIds = [...second].sort();

  return firstIds.every((setId, index) => setId === secondIds[index]);
}

export function getElementsInRegion(diagram: VennDiagram, region: VennRegion): VennElement[] {
  return diagram.elements.filter((element) => hasSameSetIds(element.setIds, region.setIds));
}

export function getRegionForElement(diagram: VennDiagram, element: VennElement): VennRegion {
  const region = getVennRegions(diagram).find((current) =>
    hasSameSetIds(current.setIds, element.setIds),
  );

  if (!region) {
    throw new Error(`No se encontró una región para "${element.id}".`);
  }

  return region;
}
