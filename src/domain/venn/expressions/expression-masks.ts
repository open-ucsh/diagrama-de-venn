import type { VennDiagram } from "@/domain/venn/models";
import { getVennRegions } from "@/domain/venn/regions";

export function getUniverseMask(setCount: number): number {
  const regionCount = 2 ** setCount;

  return 2 ** regionCount - 1;
}

export function getSetMask(setIndex: number, setCount: number): number {
  const regionCount = 2 ** setCount;
  const membershipBit = 1 << setIndex;
  let mask = 0;

  for (let combination = 0; combination < regionCount; combination += 1) {
    if ((combination & membershipBit) !== 0) {
      mask |= 1 << combination;
    }
  }

  return mask;
}

export function getSelectedMask(diagram: VennDiagram, selectedRegionIds: string[]): number {
  if (selectedRegionIds.length === 0) {
    return 0;
  }

  const selectedIds = new Set(selectedRegionIds);

  return getVennRegions(diagram).reduce(
    (mask, region, index) => (selectedIds.has(region.id) ? mask | (1 << index) : mask),
    0,
  );
}

export function getRegionIdsFromMask(diagram: VennDiagram, mask: number): string[] {
  if (mask === 0) {
    return [];
  }

  return getVennRegions(diagram)
    .filter((_, index) => (mask & (1 << index)) !== 0)
    .map((region) => region.id);
}
