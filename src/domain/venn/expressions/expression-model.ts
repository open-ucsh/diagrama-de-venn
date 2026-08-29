export type ExpressionOperator =
  | "atom"
  | "complement"
  | "intersection"
  | "difference"
  | "symmetric-difference"
  | "union";

export type BinaryExpressionOperator = Exclude<ExpressionOperator, "atom" | "complement">;

export interface Expression {
  text: string;
  mask: number;
  operator: ExpressionOperator;
  operationCount: number;
  parenthesesCount: number;
}

export const EXPRESSION_PRECEDENCE: Record<ExpressionOperator, number> = {
  atom: 6,
  complement: 5,
  intersection: 4,
  difference: 3,
  "symmetric-difference": 2,
  union: 1,
};
