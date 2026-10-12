import { useCallback, useState } from "react";

const FORMULA_HISTORY_STORAGE_KEY = "venn-formula-history";
const MAX_FORMULA_HISTORY = 10;

function loadFormulaHistory(): string[] {
  try {
    const storedValue = window.localStorage.getItem(FORMULA_HISTORY_STORAGE_KEY);

    if (!storedValue) return [];

    const parsed: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .slice(0, MAX_FORMULA_HISTORY);
  } catch {
    return [];
  }
}

function persistFormulaHistory(formulas: string[]) {
  try {
    window.localStorage.setItem(FORMULA_HISTORY_STORAGE_KEY, JSON.stringify(formulas));
  } catch {
    // El historial seguirá disponible durante esta sesión.
  }
}

export function useFormulaHistory() {
  const [formulaHistory, setFormulaHistory] = useState<string[]>(loadFormulaHistory);

  const saveFormulaToHistory = useCallback((value: string) => {
    const normalized = value.trim();

    if (!normalized) return;

    setFormulaHistory((currentHistory) => {
      const nextHistory = [
        normalized,
        ...currentHistory.filter((item) => item !== normalized),
      ].slice(0, MAX_FORMULA_HISTORY);

      persistFormulaHistory(nextHistory);
      return nextHistory;
    });
  }, []);

  function clearFormulaHistory() {
    setFormulaHistory([]);
    persistFormulaHistory([]);
  }

  function deleteFormulaFromHistory(formulaToDelete: string) {
    setFormulaHistory((currentHistory) => {
      const nextHistory = currentHistory.filter((item) => item !== formulaToDelete);

      persistFormulaHistory(nextHistory);
      return nextHistory;
    });
  }

  return {
    formulaHistory,
    saveFormulaToHistory,
    clearFormulaHistory,
    deleteFormulaFromHistory,
  };
}
