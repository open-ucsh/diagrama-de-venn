export interface MinimumExpressionResult {
  text: string;
  operationCount: number;
  parenthesesCount: number;
  minimumOperations: boolean;
}

export interface ExpressionWorkerRequest {
  id: number;
  names: string[];
  mask: number;
  maxOperations: number;
}

export type ExpressionWorkerResponse =
  | {
      id: number;
      success: true;
      result: MinimumExpressionResult | null;
    }
  | {
      id: number;
      success: false;
      error: string;
    };
