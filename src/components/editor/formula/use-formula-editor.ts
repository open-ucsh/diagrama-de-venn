import { useMinimumExpression } from "@/components/editor/formula/use-minimum-expression";
import { type ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useFormulaHistory } from "@/components/editor/formula/use-formula-history";
import { parseVennExpression, VennExpressionError } from "@/domain/venn/expressions";
import { useVennStore } from "@/state/venn-store";

export function useFormulaEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  const draftRef = useRef("");
  const focusFrameRef = useRef<number | null>(null);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const setRegionSelection = useVennStore((state) => state.setRegionSelection);
  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { formulaHistory, saveFormulaToHistory, clearFormulaHistory, deleteFormulaFromHistory } =
    useFormulaHistory();

  const { search, invalidateSearch } = useMinimumExpression({
    diagram,
    selectedRegionIds,
    isEditing,
    isEditingRef,
    attempt,
    saveFormulaToHistory,
  });

  const diagramRef = useRef(diagram);

  const formula = isEditing ? draft : search.text;
  const error = isEditing ? draftError : null;
  const formulaRef = useRef(formula);

  useLayoutEffect(() => {
    diagramRef.current = diagram;
    formulaRef.current = formula;
  }, [diagram, formula]);

  useEffect(() => {
    return () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
    };
  }, []);

  function updateDraft(value: string): void {
    draftRef.current = value;
    setDraft(value);
  }

  function focusInput(position: number): void {
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
    }

    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = null;

      const input = inputRef.current;

      input?.focus();
      input?.setSelectionRange(position, position);
    });
  }

  function beginEditing(): void {
    if (isEditingRef.current) {
      return;
    }

    isEditingRef.current = true;
    invalidateSearch();

    updateDraft(formulaRef.current);
    setDraftError(null);
    setIsEditing(true);

    // Invalida el resultado anterior aunque la selección no cambie.
    setAttempt((current) => current + 1);
  }

  function finishEditing(): void {
    if (!isEditingRef.current) {
      return;
    }

    recordFormula(draftRef.current);
    isEditingRef.current = false;
    setIsEditing(false);
  }

  function applyFormula(value: string): void {
    updateDraft(value);

    if (!value.trim()) {
      setDraftError(null);
      setRegionSelection([]);
      return;
    }

    try {
      const parsed = parseVennExpression(diagramRef.current, value);

      setRegionSelection(parsed.regionIds);
      setDraftError(null);
    } catch (caughtError) {
      setDraftError(
        caughtError instanceof VennExpressionError
          ? caughtError.message
          : "No fue posible interpretar la fórmula.",
      );
    }
  }

  function isHistoryFormulaAvailable(value: string): boolean {
    if (!value.trim()) {
      return false;
    }

    try {
      parseVennExpression(diagramRef.current, value);
      return true;
    } catch {
      return false;
    }
  }

  function recordFormula(value: string): void {
    if (isHistoryFormulaAvailable(value)) {
      saveFormulaToHistory(value);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.currentTarget.value;

    beginEditing();
    applyFormula(value);
  }

  function insertSymbol(symbol: string): void {
    beginEditing();

    const value = draftRef.current;
    const start = inputRef.current?.selectionStart ?? value.length;
    const end = inputRef.current?.selectionEnd ?? value.length;

    applyFormula(value.slice(0, start) + symbol + value.slice(end));
    focusInput(start + symbol.length);
  }

  function clearFormula(): void {
    beginEditing();
    updateDraft("");
    setDraftError(null);
    clearRegionSelection();
    focusInput(0);
  }

  function applyHistoryFormula(value: string): void {
    if (!isHistoryFormulaAvailable(value)) {
      return;
    }

    beginEditing();
    applyFormula(value);
    saveFormulaToHistory(value);
    focusInput(value.length);
  }

  const isCalculating = search.status === "searching";
  const calculationError = search.error;
  const isMinimum = search.status === "ready";
  const hasFormula = formula.trim().length > 0;
  const isValid = hasFormula && error === null && calculationError === null;

  return {
    inputRef,
    formula,
    error,
    calculationError,
    isCalculating,
    isMinimum,
    selectedRegionIds,
    formulaHistory,
    beginEditing,
    finishEditing,
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
