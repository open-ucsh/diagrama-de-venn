import {
  EXPRESSION_PRECEDENCE,
  type BinaryExpressionOperator,
  type Expression,
  type ExpressionOperator,
} from "./expression-model";

export function countParentheses(text: string): number {
  return [...text].filter((character) => character === "(" || character === ")").length;
}

function wrapExpression(
  expression: Expression,
  parentOperator: ExpressionOperator,
  side: "left" | "right",
): string {
  const expressionPrecedence = EXPRESSION_PRECEDENCE[expression.operator];

  const parentPrecedence = EXPRESSION_PRECEDENCE[parentOperator];

  const needsParentheses =
    expressionPrecedence < parentPrecedence ||
    (side === "right" &&
      parentOperator === "difference" &&
      expressionPrecedence <= parentPrecedence);

  return needsParentheses ? `(${expression.text})` : expression.text;
}

export function createAtomExpression(text: string, mask: number): Expression {
  return {
    text,
    mask,
    operator: "atom",
    operationCount: 0,
    parenthesesCount: 0,
  };
}

export function createComplementExpression(
  expression: Expression,
  universeMask: number,
): Expression {
  const value =
    expression.operator === "atom" || expression.operator === "complement"
      ? expression.text
      : `(${expression.text})`;

  const text = `${value}ᶜ`;

  return {
    text,
    mask: universeMask ^ expression.mask,
    operator: "complement",
    operationCount: expression.operationCount + 1,
    parenthesesCount: countParentheses(text),
  };
}

export function createBinaryExpression(
  first: Expression,
  second: Expression,
  operator: BinaryExpressionOperator,
  symbol: string,
  mask: number,
): Expression {
  const left = wrapExpression(first, operator, "left");

  const right = wrapExpression(second, operator, "right");

  const text = `${left} ${symbol} ${right}`;

  return {
    text,
    mask,
    operator,
    operationCount: first.operationCount + second.operationCount + 1,
    parenthesesCount: countParentheses(text),
  };
}
