import { isPointInsideSet } from "@/domain/venn/geometry";
import type { Point, VennDiagram } from "@/domain/venn/models";

export interface VennRegion {
  id: string;
  setIds: string[];
}

export function createRegionId(setIds: readonly string[]): string {
  return setIds.length === 0 ? "outside" : `region:${[...setIds].sort().join(":")}`;
}

export function getVennRegions(diagram: VennDiagram): VennRegion[] {
  const totalCombinations = 2 ** diagram.sets.length;

  return Array.from({ length: totalCombinations }, (_, combination) => {
    const setIds = diagram.sets
      .filter((_, index) => (combination & (1 << index)) !== 0)
      .map((set) => set.id);

    return {
      id: createRegionId(setIds),
      setIds,
    };
  });
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
    const set = diagram.sets.find((current) => current.id === setId);

    if (!set) {
      throw new Error(`No existe el conjunto "${setId}".`);
    }

    return set.name;
  });

  return setNames.length === 1 ? `Solo ${setNames[0]}` : setNames.join(" ∩ ");
}
