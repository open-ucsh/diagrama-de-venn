import type { VennDiagram, VennElement } from "./models";
import { getVennRegions, type VennRegion } from "./regions";

function hasSameSetIds(firstSetIds: string[], secondSetIds: string[]): boolean {
  if (firstSetIds.length !== secondSetIds.length) {
    return false;
  }

  const firstIds = [...firstSetIds].sort();
  const secondIds = [...secondSetIds].sort();

  return firstIds.every((setId, index) => setId === secondIds[index]);
}

export function getElementsInRegion(diagram: VennDiagram, region: VennRegion): VennElement[] {
  return diagram.elements.filter((element) => hasSameSetIds(element.setIds, region.setIds));
}

export function getRegionForElement(diagram: VennDiagram, element: VennElement): VennRegion {
  const region = getVennRegions(diagram).find((currentRegion) =>
    hasSameSetIds(currentRegion.setIds, element.setIds),
  );

  if (!region) {
    throw new Error(`No se encontró una región para "${element.id}".`);
  }

  return region;
}
