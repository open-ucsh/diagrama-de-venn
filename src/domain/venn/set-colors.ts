import { DEFAULT_SET_COLORS } from "@/domain/venn/factories";
import type { VennSet } from "@/domain/venn/models";

export function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_SET_COLORS[index] ?? DEFAULT_SET_COLORS[0];
}
