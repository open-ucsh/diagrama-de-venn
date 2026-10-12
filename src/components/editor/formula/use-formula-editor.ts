import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  getSelectedRegionsExpression,
  parseVennExpression,
  prepareDiagramExpressions,
  VennExpressionError,
} from "@/domain/venn/expressions";
import { useVennStore } from "@/state/venn-store";
import { useFormulaHistory } from "./use-formula-history";

export function useFormulaEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const setRegionSelection = useVennStore((state) => state.setRegionSelection);
  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [formula, setFormula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { formulaHistory, saveFormulaToHistory, clearFormulaHistory, deleteFormulaFromHistory } =
    useFormulaHistory();

  const selectedExpression = useMemo(
    () => getSelectedRegionsExpression(diagram, selectedRegionIds),
    [diagram, selectedRegionIds],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      prepareDiagramExpressions(diagram);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [diagram]);

  useEffect(() => {
    if (isEditingRef.current) return;

    setFormula(selectedExpression ?? "");
    setError(null);
  }, [selectedExpression]);

  useEffect(() => {
    if (isEditingRef.current || !selectedExpression) return;

    const timeoutId = window.setTimeout(() => {
      saveFormulaToHistory(selectedExpression);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [saveFormulaToHistory, selectedExpression]);

  function applyFormula(value: string) {
    setFormula(value);

    if (!value.trim()) {
      setError(null);
      setRegionSelection([]);
      return;
    }

    try {
      const parsed = parseVennExpression(diagram, value);
      setRegionSelection(parsed.regionIds);
      setError(null);
    } catch (caughtError) {
      if (caughtError instanceof VennExpressionError) {
        setError(caughtError.message);
      } else {
        setError("No fue posible interpretar la fórmula.");
      }
    }
  }

  function recordFormula(value: string) {
    if (!value.trim()) return;

    try {
      parseVennExpression(diagram, value);
      saveFormulaToHistory(value);
    } catch {
      // Solo se guardan fórmulas válidas.
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    applyFormula(event.target.value);
  }

  function insertSymbol(symbol: string) {
    const input = inputRef.current;

    if (!input) {
      applyFormula(`${formula}${symbol}`);
      return;
    }

    const start = input.selectionStart ?? formula.length;
    const end = input.selectionEnd ?? formula.length;
    const nextFormula = formula.slice(0, start) + symbol + formula.slice(end);

    applyFormula(nextFormula);

    window.requestAnimationFrame(() => {
      const cursorPosition = start + symbol.length;

      input.focus();
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  function clearFormula() {
    setFormula("");
    setError(null);
    clearRegionSelection();
    inputRef.current?.focus();
  }

  function isHistoryFormulaAvailable(historicalFormula: string): boolean {
    try {
      parseVennExpression(diagram, historicalFormula);
      return true;
    } catch {
      return false;
    }
  }

  function applyHistoryFormula(historicalFormula: string) {
    if (!isHistoryFormulaAvailable(historicalFormula)) return;

    isEditingRef.current = true;
    applyFormula(historicalFormula);
    saveFormulaToHistory(historicalFormula);

    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.focus();
      input?.setSelectionRange(historicalFormula.length, historicalFormula.length);
    });
  }

  const hasFormula = formula.trim().length > 0;
  const isValid = hasFormula && !error;

  return {
    inputRef,
    isEditingRef,
    formula,
    error,
    selectedRegionIds,
    formulaHistory,
    handleChange,
    recordFormula,
    clearFormula,
    insertSymbol,
    isHistoryFormulaAvailable,
    applyHistoryFormula,
    clearFormulaHistory,
    deleteFormulaFromHistory,
    hasFormula,
    isValid,
  };
}
