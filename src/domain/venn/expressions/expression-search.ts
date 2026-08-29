import type { VennDiagram } from "../models";

import {
  createAtomExpression,
  createBinaryExpression,
  createComplementExpression,
} from "./expression-format";

import { getSetMask, getUniverseMask } from "./expression-masks";

import type { Expression } from "./expression-model";

function isBetterExpression(candidate: Expression, current?: Expression): boolean {
  if (!current) {
    return true;
  }

  if (candidate.operationCount !== current.operationCount) {
    return candidate.operationCount < current.operationCount;
  }

  if (candidate.parenthesesCount !== current.parenthesesCount) {
    return candidate.parenthesesCount < current.parenthesesCount;
  }

  return candidate.text.length < current.text.length;
}

function addExpression(expressions: Map<number, Expression>, expression: Expression): boolean {
  const current = expressions.get(expression.mask);

  if (!isBetterExpression(expression, current)) {
    return false;
  }

  expressions.set(expression.mask, expression);

  return true;
}

export function generateSimpleExpressions(diagram: VennDiagram): Map<number, Expression> {
  const setCount = diagram.sets.length;

  const universeMask = getUniverseMask(setCount);

  const expressions = new Map<number, Expression>();

  addExpression(expressions, createAtomExpression("∅", 0));

  addExpression(expressions, createAtomExpression("U", universeMask));

  diagram.sets.forEach((set, index) => {
    addExpression(expressions, createAtomExpression(set.name, getSetMask(index, setCount)));
  });

  const maximumIterations = 12;

  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    const currentExpressions = [...expressions.values()];

    let changed = false;

    currentExpressions.forEach((expression) => {
      changed =
        addExpression(expressions, createComplementExpression(expression, universeMask)) || changed;
    });

    for (let firstIndex = 0; firstIndex < currentExpressions.length; firstIndex += 1) {
      const first = currentExpressions[firstIndex];

      if (!first) {
        continue;
      }

      for (
        let secondIndex = firstIndex;
        secondIndex < currentExpressions.length;
        secondIndex += 1
      ) {
        const second = currentExpressions[secondIndex];

        if (!second) {
          continue;
        }

        changed =
          addExpression(
            expressions,
            createBinaryExpression(first, second, "union", "∪", first.mask | second.mask),
          ) || changed;

        changed =
          addExpression(
            expressions,
            createBinaryExpression(first, second, "intersection", "∩", first.mask & second.mask),
          ) || changed;

        changed =
          addExpression(
            expressions,
            createBinaryExpression(
              first,
              second,
              "symmetric-difference",
              "△",
              first.mask ^ second.mask,
            ),
          ) || changed;

        changed =
          addExpression(
            expressions,
            createBinaryExpression(
              first,
              second,
              "difference",
              "\\",
              first.mask & (universeMask ^ second.mask),
            ),
          ) || changed;

        changed =
          addExpression(
            expressions,
            createBinaryExpression(
              second,
              first,
              "difference",
              "\\",
              second.mask & (universeMask ^ first.mask),
            ),
          ) || changed;
      }
    }

    if (!changed) {
      break;
    }
  }

  return expressions;
}
