import { useCallback, useEffect, useState } from "react";

const FORMULA_HISTORY_STORAGE_KEY = "venn-formula-history";
const MAX_FORMULA_HISTORY = 10;

function normalizeHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const formulas = value
    .filter((entry: unknown): entry is string => typeof entry === "string")
    .map((formula) => formula.trim())
    .filter((formula) => formula.length > 0);

  return [...new Set(formulas)].slice(0, MAX_FORMULA_HISTORY);
}

function loadFormulaHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(FORMULA_HISTORY_STORAGE_KEY);

    if (storedValue === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(storedValue);

    return normalizeHistory(parsed);
  } catch {
    // Un historial ilegible no debe impedir abrir el editor.
    return [];
  }
}

function persistFormulaHistory(formulas: readonly string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FORMULA_HISTORY_STORAGE_KEY, JSON.stringify(formulas));
  } catch {
    // El historial permanece disponible en memoria si falla la persistencia.
  }
}

export function useFormulaHistory() {
  const [formulaHistory, setFormulaHistory] = useState<string[]>(loadFormulaHistory);

  useEffect(() => {
    persistFormulaHistory(formulaHistory);
  }, [formulaHistory]);

  const saveFormulaToHistory = useCallback((value: string): void => {
    const formula = value.trim();

    if (!formula) {
      return;
    }

    setFormulaHistory((current) => {
      if (current[0] === formula) {
        return current;
      }

      return [formula, ...current.filter((entry) => entry !== formula)].slice(
        0,
        MAX_FORMULA_HISTORY,
      );
    });
  }, []);

  const clearFormulaHistory = useCallback((): void => {
    setFormulaHistory((current) => (current.length > 0 ? [] : current));
  }, []);

  const deleteFormulaFromHistory = useCallback((formula: string): void => {
    setFormulaHistory((current) =>
      current.includes(formula) ? current.filter((entry) => entry !== formula) : current,
    );
  }, []);

  return {
    formulaHistory,
    saveFormulaToHistory,
    clearFormulaHistory,
    deleteFormulaFromHistory,
  };
}
