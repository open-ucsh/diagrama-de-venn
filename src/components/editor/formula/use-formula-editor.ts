import { type ChangeEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useFormulaHistory } from "@/components/editor/formula/use-formula-history";
import { parseVennExpression, VennExpressionError } from "@/domain/venn/expressions";
import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import { ExpressionEngine } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";
import { useVennExpression, type VennExpressionState } from "@/state/venn-expression";
import { useVennStore } from "@/state/venn-store";

const SEARCH_DELAY_MS = 200;
const HISTORY_DELAY_MS = 700;

interface CompletedSearch extends VennExpressionState {
  attempt: number;
}

function createIdleSearch(key: string): VennExpressionState {
  return {
    key,
    status: "idle",
    text: "",
    error: null,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useFormulaEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ExpressionEngine | null>(null);
  const engineErrorRef = useRef<Error | null>(null);
  const isEditingRef = useRef(false);
  const draftRef = useRef("");
  const requestVersionRef = useRef(0);
  const focusFrameRef = useRef<number | null>(null);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const setRegionSelection = useVennStore((state) => state.setRegionSelection);
  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [completedSearch, setCompletedSearch] = useState<CompletedSearch | null>(null);

  const { formulaHistory, saveFormulaToHistory, clearFormulaHistory, deleteFormulaFromHistory } =
    useFormulaHistory();

  const namesKey = JSON.stringify(diagram.sets.map((set) => set.name));
  const setsKey = JSON.stringify(diagram.sets.map(({ id, name }) => ({ id, name })));
  const selectedMask = getSelectedMask(diagram, selectedRegionIds);
  const hasSelection = selectedRegionIds.length > 0;
  const searchKey = JSON.stringify([setsKey, selectedMask, hasSelection]);

  const diagramRef = useRef(diagram);
  const latestSearchKeyRef = useRef(searchKey);

  const search = useMemo<VennExpressionState>(() => {
    if (isEditing || !hasSelection) {
      return createIdleSearch(searchKey);
    }

    if (completedSearch?.key === searchKey && completedSearch.attempt === attempt) {
      return {
        key: completedSearch.key,
        status: completedSearch.status,
        text: completedSearch.text,
        error: completedSearch.error,
      };
    }

    return {
      key: searchKey,
      status: "searching",
      text: "",
      error: null,
    };
  }, [isEditing, hasSelection, searchKey, completedSearch, attempt]);

  const formula = isEditing ? draft : search.text;
  const error = isEditing ? draftError : null;
  const formulaRef = useRef(formula);

  useLayoutEffect(() => {
    diagramRef.current = diagram;
    latestSearchKeyRef.current = searchKey;
    formulaRef.current = formula;
  }, [diagram, searchKey, formula]);

  useLayoutEffect(() => {
    useVennExpression.setState(search);
  }, [search]);

  useEffect(() => {
    engineErrorRef.current = null;

    const names = diagramRef.current.sets.map((set) => set.name);

    if (names.length === 0) {
      return;
    }

    let engine: ExpressionEngine;

    try {
      engine = new ExpressionEngine(names);
      engineRef.current = engine;
    } catch (error) {
      engineErrorRef.current =
        error instanceof Error ? error : new Error("No fue posible iniciar el motor de fórmulas.");

      return;
    }

    return () => {
      engine.dispose();

      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [namesKey]);

  useEffect(() => {
    const version = ++requestVersionRef.current;
    let cancelled = false;

    if (isEditing || !hasSelection) {
      return;
    }

    const searchDiagram = diagramRef.current;

    function isCurrent(): boolean {
      return (
        !cancelled &&
        requestVersionRef.current === version &&
        !isEditingRef.current &&
        latestSearchKeyRef.current === searchKey
      );
    }

    async function calculate(): Promise<void> {
      if (!isCurrent()) {
        return;
      }

      if (engineErrorRef.current) {
        throw engineErrorRef.current;
      }

      const engine = engineRef.current;

      if (!engine) {
        throw new Error("El motor de fórmulas no está disponible.");
      }

      const result = await findMinimumExpression({
        engine,
        diagram: searchDiagram,
        selectedMask,
        isCurrent,
      });

      if (!result || !isCurrent()) {
        return;
      }

      setCompletedSearch({
        key: searchKey,
        attempt,
        status: "ready",
        text: result.text,
        error: null,
      });
    }

    const timeoutId = window.setTimeout(() => {
      void calculate().catch((error: unknown) => {
        if (!isCurrent()) {
          return;
        }

        setCompletedSearch({
          key: searchKey,
          attempt,
          status: "error",
          text: "",
          error: getErrorMessage(error, "No fue posible calcular la fórmula."),
        });
      });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchKey, selectedMask, hasSelection, isEditing, namesKey, attempt]);

  useEffect(() => {
    if (search.status !== "ready" || !search.text) {
      return;
    }

    const version = requestVersionRef.current;

    const timeoutId = window.setTimeout(() => {
      if (
        !isEditingRef.current &&
        requestVersionRef.current === version &&
        latestSearchKeyRef.current === search.key
      ) {
        saveFormulaToHistory(search.text);
      }
    }, HISTORY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, saveFormulaToHistory]);

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;

      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }

      useVennExpression.setState(createIdleSearch(""));
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

    requestVersionRef.current += 1;
    isEditingRef.current = true;

    updateDraft(formulaRef.current);
    setDraftError(null);
    setIsEditing(true);

    // Invalida el resultado anterior aunque la selección no cambie.
    setAttempt((current) => current + 1);

    useVennExpression.setState(createIdleSearch(latestSearchKeyRef.current));
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
