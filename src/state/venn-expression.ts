import { create } from "zustand";

export interface VennExpressionState {
  key: string;
  status: "idle" | "searching" | "ready" | "error";
  text: string;
  error: string | null;
}

export const useVennExpression = create<VennExpressionState>()(() => ({
  key: "",
  status: "idle",
  text: "",
  error: null,
}));
