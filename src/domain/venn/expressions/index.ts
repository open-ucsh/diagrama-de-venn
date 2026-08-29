import type { VennDiagram } from "../models";

import { getCanonicalExpression } from "./canonical-expression";

import { getSelectedMask } from "./expression-masks";

import type { Expression } from "./expression-model";

import { generateSimpleExpressions } from "./expression-search";

const MAX_EXHAUSTIVE_SET_COUNT = 3;
const MAX_CACHE_ENTRIES = 10;

const expressionCache = new Map<string, Map<number, Expression>>();

function getDiagramCacheKey(diagram: VennDiagram): string {
  return JSON.stringify(
    diagram.sets.map((set) => ({
      id: set.id,
      name: set.name,
    })),
  );
}

function saveExpressionsInCache(key: string, expressions: Map<number, Expression>) {
  if (expressionCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = expressionCache.keys().next().value;

    if (oldestKey !== undefined) {
      expressionCache.delete(oldestKey);
    }
  }

  expressionCache.set(key, expressions);
}

function getDiagramExpressions(diagram: VennDiagram): Map<number, Expression> | null {
  if (diagram.sets.length > MAX_EXHAUSTIVE_SET_COUNT) {
    return null;
  }

  const key = getDiagramCacheKey(diagram);
  const cached = expressionCache.get(key);

  if (cached) {
    return cached;
  }

  const expressions = generateSimpleExpressions(diagram);

  saveExpressionsInCache(key, expressions);

  return expressions;
}

export function prepareDiagramExpressions(diagram: VennDiagram): void {
  getDiagramExpressions(diagram);
}

export function getSelectedRegionsExpression(
  diagram: VennDiagram,
  selectedRegionIds: string[],
): string | null {
  if (selectedRegionIds.length === 0) {
    return null;
  }

  const expressions = getDiagramExpressions(diagram);

  if (!expressions) {
    return getCanonicalExpression(diagram, selectedRegionIds);
  }

  const selectedMask = getSelectedMask(diagram, selectedRegionIds);

  return expressions.get(selectedMask)?.text ?? getCanonicalExpression(diagram, selectedRegionIds);
}
