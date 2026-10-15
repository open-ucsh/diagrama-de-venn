import { useCallback, useEffect, useState } from "react";

const FORMULA_HISTORY_STORAGE_KEY = "venn-formula-history";
const MAX_FORMULA_HISTORY = 10;

function loadFormulaHistory(): string[] {
  try {
    const storedValue = window.localStorage.getItem(FORMULA_HISTORY_STORAGE_KEY);

    if (!storedValue) return [];

    const parsed: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) return [];

    const formulas = parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return [...new Set(formulas)].slice(0, MAX_FORMULA_HISTORY);
  } catch {
    // Un historial ilegible no debe impedir que el editor se abra.
    return [];
  }
}

function persistFormulaHistory(formulas: string[]): void {
  try {
    window.localStorage.setItem(FORMULA_HISTORY_STORAGE_KEY, JSON.stringify(formulas));
  } catch {
    // Si el almacenamiento falla, el historial sigue disponible en memoria.
  }
}

export function useFormulaHistory() {
  const [formulaHistory, setFormulaHistory] = useState<string[]>(loadFormulaHistory);

  useEffect(() => {
    persistFormulaHistory(formulaHistory);
  }, [formulaHistory]);

  const saveFormulaToHistory = useCallback((value: string) => {
    const normalized = value.trim();

    if (!normalized) return;

    setFormulaHistory((currentHistory) => {
      if (currentHistory[0] === normalized) {
        return currentHistory;
      }

      return [normalized, ...currentHistory.filter((formula) => formula !== normalized)].slice(
        0,
        MAX_FORMULA_HISTORY,
      );
    });
  }, []);

  const clearFormulaHistory = useCallback(() => {
    setFormulaHistory((currentHistory) => (currentHistory.length === 0 ? currentHistory : []));
  }, []);

  const deleteFormulaFromHistory = useCallback((formulaToDelete: string) => {
    setFormulaHistory((currentHistory) => {
      if (!currentHistory.includes(formulaToDelete)) {
        return currentHistory;
      }

      return currentHistory.filter((formula) => formula !== formulaToDelete);
    });
  }, []);

  return {
    formulaHistory,
    saveFormulaToHistory,
    clearFormulaHistory,
    deleteFormulaFromHistory,
  };
}
