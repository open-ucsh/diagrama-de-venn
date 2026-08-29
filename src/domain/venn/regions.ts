import { isPointInsideSet } from "./geometry";

import type { Point, VennDiagram } from "./models";

export interface VennRegion {
  id: string;
  setIds: string[];
}

export function createRegionId(setIds: string[]): string {
  if (setIds.length === 0) {
    return "outside";
  }

  return `region:${[...setIds].sort().join(":")}`;
}

export function getVennRegions(diagram: VennDiagram): VennRegion[] {
  const regions: VennRegion[] = [];
  const totalCombinations = 2 ** diagram.sets.length;

  for (let combination = 0; combination < totalCombinations; combination += 1) {
    const setIds = diagram.sets
      .filter((_, index) => (combination & (1 << index)) !== 0)
      .map((set) => set.id);

    regions.push({
      id: createRegionId(setIds),
      setIds,
    });
  }

  return regions;
}

export function getRegionAtPoint(diagram: VennDiagram, point: Point): VennRegion {
  const setIds = diagram.sets.filter((set) => isPointInsideSet(point, set)).map((set) => set.id);

  return {
    id: createRegionId(setIds),
    setIds,
  };
}

export function findVennRegion(diagram: VennDiagram, regionId: string): VennRegion | undefined {
  return getVennRegions(diagram).find((region) => region.id === regionId);
}

export function getRegionLabel(diagram: VennDiagram, region: VennRegion): string {
  if (region.setIds.length === 0) {
    return "Exterior";
  }

  const setNames = region.setIds.map((setId) => {
    const set = diagram.sets.find((currentSet) => currentSet.id === setId);

    if (!set) {
      throw new Error(`No existe el conjunto "${setId}".`);
    }

    return set.name;
  });

  if (setNames.length === 1) {
    return `Solo ${setNames[0]}`;
  }

  return setNames.join(" ∩ ");
}
