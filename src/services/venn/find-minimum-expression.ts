import { parseVennExpression } from "@/domain/venn/expressions";
import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import type { VennDiagram } from "@/domain/venn/models";

import type { ExpressionEngine, MinimumExpressionResult } from "./expression-engine";

const INITIAL_OPERATION_LIMIT = 3;
const MAX_OPERATION_LIMIT = 127;

interface MinimumExpressionSearch {
  engine: Pick<ExpressionEngine, "findMinimum">;
  diagram: VennDiagram;
  selectedMask: number;
  isCurrent: () => boolean;
}

/**
 * Busca y verifica una fórmula para la selección.
 * Devuelve null cuando la solicitud deja de estar vigente.
 */
export async function findMinimumExpression({
  engine,
  diagram,
  selectedMask,
  isCurrent,
}: MinimumExpressionSearch): Promise<MinimumExpressionResult | null> {
  for (let limit = INITIAL_OPERATION_LIMIT; limit <= MAX_OPERATION_LIMIT; limit += 1) {
    if (!isCurrent()) return null;

    const result = await engine.findMinimum(selectedMask, limit);

    if (!isCurrent()) return null;
    if (!result) continue;

    const parsed = parseVennExpression(diagram, result.text);
    const parsedMask = getSelectedMask(diagram, parsed.regionIds);

    if (parsedMask !== selectedMask) {
      throw new Error("La fórmula calculada no coincide con las regiones seleccionadas.");
    }

    if (!result.minimumOperations) {
      throw new Error("El motor no confirmó que la fórmula tenga el mínimo de operaciones.");
    }

    return result;
  }

  throw new Error("No fue posible encontrar una fórmula mínima.");
}
