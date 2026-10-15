import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { parseVennExpression, VennExpressionError } from "@/domain/venn/expressions";
import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import { ExpressionEngine } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";
import { useVennExpression, type VennExpressionState } from "@/state/venn-expression";
import { useVennStore } from "@/state/venn-store";

import { useFormulaHistory } from "./use-formula-history";

const SEARCH_DELAY_MS = 200;
const HISTORY_DELAY_MS = 700;

export function useFormulaEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  const engineRef = useRef<ExpressionEngine | null>(null);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const setRegionSelection = useVennStore((state) => state.setRegionSelection);
  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [formula, setFormula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState<VennExpressionState>({
    key: "",
    status: "idle",
    text: "",
    error: null,
  });

  const { formulaHistory, saveFormulaToHistory, clearFormulaHistory, deleteFormulaFromHistory } =
    useFormulaHistory();

  const setsKey = JSON.stringify(diagram.sets.map((set) => ({ id: set.id, name: set.name })));

  const selectedMask = useMemo(
    () => getSelectedMask(diagram, selectedRegionIds),
    [diagram, selectedRegionIds],
  );

  const hasSelection = selectedRegionIds.length > 0;
  const searchKey = JSON.stringify([setsKey, selectedMask, hasSelection]);
  const latestSearchKeyRef = useRef(searchKey);

  latestSearchKeyRef.current = searchKey;

  useEffect(() => {
    useVennExpression.setState(search);
  }, [search]);

  useEffect(() => {
    engineRef.current?.dispose();
    engineRef.current = null;

    if (diagram.sets.length === 0) return;

    try {
      engineRef.current = new ExpressionEngine(diagram.sets.map((set) => set.name));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No fue posible iniciar el motor de fórmulas.",
      );
    }

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };

    // La geometría, los colores y los elementos no cambian el motor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setsKey]);

  useEffect(() => {
    if (isEditing) return;

    let cancelled = false;

    function isCurrent() {
      return !cancelled && !isEditingRef.current && latestSearchKeyRef.current === searchKey;
    }

    setFormula("");
    setError(null);
    setSearch({
      key: searchKey,
      status: hasSelection ? "searching" : "idle",
      text: "",
      error: null,
    });

    if (!hasSelection) return;

    async function calculate() {
      if (!isCurrent()) return;

      const engine = engineRef.current;

      if (!engine) {
        throw new Error("El motor de fórmulas no está disponible.");
      }

      const result = await findMinimumExpression({
        engine,
        diagram,
        selectedMask,
        isCurrent,
      });

      if (!result || !isCurrent()) return;

      setFormula(result.text);
      setSearch({
        key: searchKey,
        status: "ready",
        text: result.text,
        error: null,
      });
    }

    const timeoutId = window.setTimeout(() => {
      void calculate().catch((caughtError: unknown) => {
        if (!isCurrent()) return;

        setSearch({
          key: searchKey,
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

    // La búsqueda depende de los conjuntos y la selección, no de su geometría.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, isEditing]);

  useEffect(() => {
    if (isEditing || search.key !== searchKey || search.status !== "ready" || !search.text) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isEditingRef.current && latestSearchKeyRef.current === search.key) {
        saveFormulaToHistory(search.text);
      }
    }, HISTORY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isEditing, search, searchKey, saveFormulaToHistory]);

  function beginEditing() {
    isEditingRef.current = true;
    setIsEditing(true);
  }

  function finishEditing() {
    recordFormula(formula);
    isEditingRef.current = false;
    setIsEditing(false);
  }

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
      setError(
        caughtError instanceof VennExpressionError
          ? caughtError.message
          : "No fue posible interpretar la fórmula.",
      );
    }
  }

  function recordFormula(value: string) {
    if (!value.trim()) return;

    try {
      parseVennExpression(diagram, value);
      saveFormulaToHistory(value);
    } catch {
      // Una expresión incompleta no debe incorporarse al historial.
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    beginEditing();
    applyFormula(event.target.value);
  }

  function insertSymbol(symbol: string) {
    beginEditing();

    const input = inputRef.current;
    const start = input?.selectionStart ?? formula.length;
    const end = input?.selectionEnd ?? formula.length;
    const nextFormula = formula.slice(0, start) + symbol + formula.slice(end);

    applyFormula(nextFormula);

    window.requestAnimationFrame(() => {
      const cursorPosition = start + symbol.length;

      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  function clearFormula() {
    beginEditing();
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

    beginEditing();
    applyFormula(historicalFormula);
    saveFormulaToHistory(historicalFormula);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(historicalFormula.length, historicalFormula.length);
    });
  }

  const isCalculating =
    !isEditing && hasSelection && (search.key !== searchKey || search.status === "searching");

  const calculationError = !isEditing && search.key === searchKey ? search.error : null;

  const isMinimum = !isEditing && search.key === searchKey && search.status === "ready";

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
