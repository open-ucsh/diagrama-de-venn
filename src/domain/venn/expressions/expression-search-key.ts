import type { VennDiagram } from "@/domain/venn/models";

export function getExpressionSearchKey(
  diagram: VennDiagram,
  selectedMask: number,
  hasSelection: boolean,
): string {
  const setsKey = JSON.stringify(diagram.sets.map(({ id, name }) => ({ id, name })));

  return JSON.stringify([setsKey, selectedMask, hasSelection]);
}
