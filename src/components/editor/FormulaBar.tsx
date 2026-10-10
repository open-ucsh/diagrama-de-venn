import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Check, CircleAlert, Sigma, X } from "lucide-react";

import {
  getSelectedRegionsExpression,
  parseVennExpression,
  prepareDiagramExpressions,
  VennExpressionError,
} from "@/domain/venn/expressions";

import { useVennStore } from "@/state/venn-store";

import { FormulaHistoryMenu } from "./FormulaHistoryMenu";

const FORMULA_HISTORY_STORAGE_KEY = "venn-formula-history";
const MAX_FORMULA_HISTORY = 10;

const FORMULA_SYMBOLS = [
  { label: "∪", value: " ∪ ", title: "Unión" },
  { label: "∩", value: " ∩ ", title: "Intersección" },
  { label: "\\", value: " \\ ", title: "Diferencia" },
  { label: "△", value: " △ ", title: "Diferencia simétrica" },
  { label: "'", value: "'", title: "Complemento" },
  { label: "(", value: "(", title: "Abrir paréntesis" },
  { label: ")", value: ")", title: "Cerrar paréntesis" },
] as const;

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

export function FormulaBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const setRegionSelection = useVennStore((state) => state.setRegionSelection);
  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [formula, setFormula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formulaHistory, setFormulaHistory] = useState<string[]>(loadFormulaHistory);

  const selectedExpression = useMemo(
    () => getSelectedRegionsExpression(diagram, selectedRegionIds),
    [diagram, selectedRegionIds],
  );

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

  const hasFormula = formula.trim().length > 0;
  const isValid = hasFormula && !error;

  return (
    <section
      aria-label="Editor de fórmula"
      className="venn-formula-bar mx-auto w-full max-w-4xl overflow-visible rounded-xl border border-border bg-white shadow-[0_4px_20px_rgba(20,43,74,0.06)]"
    >
      <div className="venn-formula-bar__input-section px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            className="venn-formula-bar__label flex items-center gap-2 text-xs font-semibold tracking-wide text-text-muted"
            htmlFor="venn-formula"
          >
            <Sigma aria-hidden="true" className="size-4 text-brand-primary" />
            Expresión
          </label>

          <span className="venn-formula-bar__hint hidden text-xs text-text-muted sm:block">
            Usa los operadores o escribe directamente
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              aria-describedby="venn-formula-status"
              aria-invalid={Boolean(error)}
              autoComplete="off"
              className="venn-formula-bar__input h-11 w-full rounded-lg border border-border bg-surface/60 px-3 pr-10 font-mono text-sm font-medium text-text outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-text-muted focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 sm:text-base"
              id="venn-formula"
              onBlur={() => {
                isEditingRef.current = false;
                recordFormula(formula);
              }}
              onChange={handleChange}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") recordFormula(formula);
              }}
              placeholder="Ejemplo: (A ∪ B) ∩ C'"
              spellCheck={false}
              type="text"
              value={formula}
            />

            {hasFormula && (
              <button
                aria-label="Limpiar fórmula"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                onClick={clearFormula}
                title="Limpiar fórmula"
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>

          <FormulaHistoryMenu
            formulas={formulaHistory}
            isAvailable={isHistoryFormulaAvailable}
            onClear={clearFormulaHistory}
            onDelete={deleteFormulaFromHistory}
            onSelect={applyHistoryFormula}
          />
        </div>

        <div
          aria-live="polite"
          className="venn-formula-bar__status flex min-h-8 items-center"
          id="venn-formula-status"
        >
          {error ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
              {error}
            </p>
          ) : isValid ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check aria-hidden="true" className="size-3.5" />
              Fórmula válida
              <span className="text-text-muted">·</span>
              {selectedRegionIds.length}{" "}
              {selectedRegionIds.length === 1 ? "región seleccionada" : "regiones seleccionadas"}
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              Escribe una expresión o selecciona regiones en el diagrama.
            </p>
          )}
        </div>
      </div>

      <div className="venn-formula-bar__actions flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2.5 sm:gap-2 sm:px-4">
        {FORMULA_SYMBOLS.map((symbol) => (
          <button
            aria-label={symbol.title}
            className="grid size-8 shrink-0 place-items-center rounded-md border border-transparent font-mono text-sm font-semibold text-text-muted transition-colors hover:border-border hover:bg-surface hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            key={symbol.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertSymbol(symbol.value)}
            title={symbol.title}
            type="button"
          >
            {symbol.label}
          </button>
        ))}

        <span className="ml-auto hidden text-xs text-text-muted sm:block">
          Atajos: <code className="font-mono">| &amp; ! -</code>
        </span>
      </div>
    </section>
  );
}
