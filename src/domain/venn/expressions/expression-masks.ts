import type { VennDiagram } from "../models";

import { createRegionId } from "../regions";

export function getUniverseMask(setCount: number): number {
  const regionCount = 2 ** setCount;

  return 2 ** regionCount - 1;
}

export function getSetMask(setIndex: number, setCount: number): number {
  const regionCount = 2 ** setCount;

  let mask = 0;

  for (let combination = 0; combination < regionCount; combination += 1) {
    const belongsToSet = (combination & (1 << setIndex)) !== 0;

    if (belongsToSet) {
      mask |= 1 << combination;
    }
  }

  return mask;
}

export function getSelectedMask(diagram: VennDiagram, selectedRegionIds: string[]): number {
  const selectedIds = new Set(selectedRegionIds);

  const regionCount = 2 ** diagram.sets.length;

  let mask = 0;

  for (let combination = 0; combination < regionCount; combination += 1) {
    const setIds = diagram.sets
      .filter((_, index) => (combination & (1 << index)) !== 0)
      .map((set) => set.id);

    const regionId = createRegionId(setIds);

    if (selectedIds.has(regionId)) {
      mask |= 1 << combination;
    }
  }

  return mask;
}
