import { type ChangeEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { parseVennExpression, VennExpressionError } from "@/domain/venn/expressions";
import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import { ExpressionEngine } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";
import { useVennExpression, type VennExpressionState } from "@/state/venn-expression";
import { useVennStore } from "@/state/venn-store";

import { useFormulaHistory } from "./use-formula-history";

const SEARCH_DELAY_MS = 200;
const HISTORY_DELAY_MS = 700;

interface CompletedSearch extends VennExpressionState {
  attempt: number;
}

function idleSearch(key: string): VennExpressionState {
  return {
    key,
    status: "idle",
    text: "",
    error: null,
  };
}

export function useFormulaEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ExpressionEngine | null>(null);
  const engineErrorRef = useRef<Error | null>(null);
  const isEditingRef = useRef(false);
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
  const names = useMemo<string[]>(() => JSON.parse(namesKey), [namesKey]);

  const setsKey = JSON.stringify(diagram.sets.map((set) => ({ id: set.id, name: set.name })));

  const selectedMask = getSelectedMask(diagram, selectedRegionIds);
  const hasSelection = selectedRegionIds.length > 0;
  const searchKey = JSON.stringify([setsKey, selectedMask, hasSelection]);

  const diagramRef = useRef(diagram);
  const latestSearchKeyRef = useRef(searchKey);

  const search = useMemo<VennExpressionState>(() => {
    if (isEditing || !hasSelection) {
      return idleSearch(searchKey);
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

  useLayoutEffect(() => {
    diagramRef.current = diagram;
    latestSearchKeyRef.current = searchKey;
  }, [diagram, searchKey]);

  useLayoutEffect(() => {
    useVennExpression.setState(search);
  }, [search]);

  useEffect(() => {
    engineErrorRef.current = null;

    if (names.length === 0) return;

    let engine: ExpressionEngine;

    try {
      engine = new ExpressionEngine(names);
    } catch (caughtError) {
      engineErrorRef.current =
        caughtError instanceof Error
          ? caughtError
          : new Error("No fue posible iniciar el motor de fórmulas.");

      return;
    }

    engineRef.current = engine;

    return () => {
      engine.dispose();

      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [names]);

  useEffect(() => {
    const version = ++requestVersionRef.current;
    let cancelled = false;

    if (isEditing || !hasSelection) return;

    const searchDiagram = diagramRef.current;

    function isCurrent() {
      return (
        !cancelled &&
        requestVersionRef.current === version &&
        !isEditingRef.current &&
        latestSearchKeyRef.current === searchKey
      );
    }

    async function calculate() {
      if (!isCurrent()) return;

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

      if (!result || !isCurrent()) return;

      setCompletedSearch({
        key: searchKey,
        attempt,
        status: "ready",
        text: result.text,
        error: null,
      });
    }

    const timeoutId = window.setTimeout(() => {
      void calculate().catch((caughtError: unknown) => {
        if (!isCurrent()) return;

        setCompletedSearch({
          key: searchKey,
          attempt,
          status: "error",
          text: "",
          error:
            caughtError instanceof Error
              ? caughtError.message
              : "No fue posible calcular la fórmula.",
        });
      });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchKey, selectedMask, hasSelection, isEditing, names, attempt]);

  useEffect(() => {
    if (search.status !== "ready" || !search.text) return;

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

    return () => window.clearTimeout(timeoutId);
  }, [search, saveFormulaToHistory]);

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;

      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }

      useVennExpression.setState(idleSearch(""));
    };
  }, []);

  function focusInput(position: number) {
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
    }

    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = null;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  }

  function beginEditing() {
    requestVersionRef.current += 1;

    if (!isEditingRef.current) {
      setDraft(formula);
      setDraftError(null);

      // Una edición nueva invalida el resultado aunque la selección no cambie.
      setAttempt((current) => current + 1);
    }

    isEditingRef.current = true;
    setIsEditing(true);

    useVennExpression.setState(idleSearch(latestSearchKeyRef.current));
  }

  function finishEditing() {
    recordFormula(formula);
    isEditingRef.current = false;
    setIsEditing(false);
  }

  function applyFormula(value: string) {
    setDraft(value);

    if (!value.trim()) {
      setDraftError(null);
      setRegionSelection([]);
      return;
    }

    try {
      const parsed = parseVennExpression(diagram, value);

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
    if (!value.trim()) return false;

    try {
      parseVennExpression(diagram, value);
      return true;
    } catch {
      return false;
    }
  }

  function recordFormula(value: string) {
    if (isHistoryFormulaAvailable(value)) {
      saveFormulaToHistory(value);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    beginEditing();
    applyFormula(event.target.value);
  }

  function insertSymbol(symbol: string) {
    beginEditing();

    const start = inputRef.current?.selectionStart ?? formula.length;
    const end = inputRef.current?.selectionEnd ?? formula.length;

    applyFormula(formula.slice(0, start) + symbol + formula.slice(end));
    focusInput(start + symbol.length);
  }

  function clearFormula() {
    beginEditing();
    setDraft("");
    setDraftError(null);
    clearRegionSelection();
    inputRef.current?.focus();
  }

  function applyHistoryFormula(historicalFormula: string) {
    if (!isHistoryFormulaAvailable(historicalFormula)) return;

    beginEditing();
    applyFormula(historicalFormula);
    saveFormulaToHistory(historicalFormula);
    focusInput(historicalFormula.length);
  }

  const isCalculating = search.status === "searching";
  const calculationError = search.error;
  const isMinimum = search.status === "ready";
  const hasFormula = formula.trim().length > 0;
  const isValid = hasFormula && !error;

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
