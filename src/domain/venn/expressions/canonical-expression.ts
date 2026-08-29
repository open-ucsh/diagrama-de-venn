import type { VennDiagram } from "../models";

import { createRegionId } from "../regions";

export function getCanonicalExpression(diagram: VennDiagram, selectedRegionIds: string[]): string {
  const selectedIds = new Set(selectedRegionIds);

  const regionCount = 2 ** diagram.sets.length;

  const terms: string[] = [];

  for (let combination = 0; combination < regionCount; combination += 1) {
    const setIds = diagram.sets
      .filter((_, index) => (combination & (1 << index)) !== 0)
      .map((set) => set.id);

    const regionId = createRegionId(setIds);

    if (!selectedIds.has(regionId)) {
      continue;
    }

    const parts = diagram.sets.map((set, index) =>
      (combination & (1 << index)) !== 0 ? set.name : `${set.name}ᶜ`,
    );

    terms.push(parts.join(" ∩ "));
  }

  if (terms.length === 1) {
    return terms[0] ?? "";
  }

  return terms.map((term) => `(${term})`).join(" ∪ ");
}
