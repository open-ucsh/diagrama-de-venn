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
  {
    label: "∪",
    value: " ∪ ",
    title: "Unión",
  },
  {
    label: "∩",
    value: " ∩ ",
    title: "Intersección",
  },
  {
    label: "\\",
    value: " \\ ",
    title: "Diferencia",
  },
  {
    label: "△",
    value: " △ ",
    title: "Diferencia simétrica",
  },
  {
    label: "'",
    value: "'",
    title: "Complemento",
  },
  {
    label: "(",
    value: "(",
    title: "Abrir paréntesis",
  },
  {
    label: ")",
    value: ")",
    title: "Cerrar paréntesis",
  },
] as const;

function loadFormulaHistory(): string[] {
  try {
    const storedValue = window.localStorage.getItem(FORMULA_HISTORY_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

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
  } catch {}
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

    if (!normalized) {
      return;
    }

    setFormulaHistory((currentHistory) => {
      const nextHistory = [
        normalized,

        ...currentHistory.filter((currentFormula) => currentFormula !== normalized),
      ].slice(0, MAX_FORMULA_HISTORY);

      persistFormulaHistory(nextHistory);

      return nextHistory;
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      prepareDiagramExpressions(diagram);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [diagram]);

  useEffect(() => {
    if (isEditingRef.current) {
      return;
    }

    setFormula(selectedExpression ?? "");

    setError(null);
  }, [selectedExpression]);

  useEffect(() => {
    if (isEditingRef.current || !selectedExpression) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveFormulaToHistory(selectedExpression);
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
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
    if (!value.trim()) {
      return;
    }

    try {
      parseVennExpression(diagram, value);

      saveFormulaToHistory(value);
    } catch {}
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
    if (!isHistoryFormulaAvailable(historicalFormula)) {
      return;
    }

    isEditingRef.current = true;

    applyFormula(historicalFormula);

    saveFormulaToHistory(historicalFormula);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();

      inputRef.current?.setSelectionRange(historicalFormula.length, historicalFormula.length);
    });
  }

  function clearFormulaHistory() {
    setFormulaHistory([]);
    persistFormulaHistory([]);
  }

  function deleteFormulaFromHistory(formulaToDelete: string) {
    setFormulaHistory((currentHistory) => {
      const nextHistory = currentHistory.filter(
        (currentFormula) => currentFormula !== formulaToDelete,
      );

      persistFormulaHistory(nextHistory);

      return nextHistory;
    });
  }

  const hasFormula = formula.trim().length > 0;

  const isValid = hasFormula && !error;

  return (
    <section
      aria-label="Editor de fórmula"
      className="rounded-xl border border-border bg-white shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary sm:flex">
          <Sigma aria-hidden="true" className="size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <label
            className="text-xs font-bold uppercase tracking-widest text-text-muted"
            htmlFor="venn-formula"
          >
            Fórmula del diagrama
          </label>

          <div className="relative mt-1">
            <input
              ref={inputRef}
              aria-describedby="venn-formula-status"
              aria-invalid={Boolean(error)}
              autoComplete="off"
              className={[
                "min-w-0 w-full border-0 bg-transparent pr-8 font-mono text-base font-bold text-text outline-none sm:pr-10 sm:text-lg",
                "placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-text-muted",
              ].join(" ")}
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
                if (event.key === "Enter") {
                  recordFormula(formula);
                }
              }}
              placeholder="Ejemplo: (A ∪ B) ∩ C'"
              spellCheck={false}
              type="text"
              value={formula}
            />

            {isValid && (
              <Check
                aria-hidden="true"
                className="absolute top-1/2 right-1 size-5 -translate-y-1/2 text-emerald-600"
              />
            )}
          </div>

          <div aria-live="polite" className="mt-1 min-h-5" id="venn-formula-status">
            {error ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />

                {error}
              </p>
            ) : isValid ? (
              <p className="text-xs font-medium text-emerald-700">
                Fórmula válida · {selectedRegionIds.length}{" "}
                {selectedRegionIds.length === 1 ? "región seleccionada" : "regiones seleccionadas"}
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Escribe una fórmula o selecciona regiones en el diagrama.
              </p>
            )}
          </div>
        </div>

        <FormulaHistoryMenu
          formulas={formulaHistory}
          isAvailable={isHistoryFormulaAvailable}
          onClear={clearFormulaHistory}
          onDelete={deleteFormulaFromHistory}
          onSelect={applyHistoryFormula}
        />

        {(hasFormula || selectedRegionIds.length > 0) && (
          <button
            aria-label="Limpiar fórmula"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            onClick={clearFormula}
            title="Limpiar fórmula"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />

            <span className="hidden sm:inline">Limpiar</span>
          </button>
        )}
      </div>
      <div className="border-t border-border px-3 py-3 sm:px-5">
        <div className="mb-2 flex items-center justify-between sm:mb-0">
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted sm:hidden">
            Insertar operador
          </span>

          <span className="text-xs text-text-muted sm:hidden">| &amp; ! -</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <span className="mr-1 hidden text-xs font-bold uppercase tracking-widest text-text-muted sm:block">
            Insertar
          </span>

          {FORMULA_SYMBOLS.map((symbol) => (
            <button
              aria-label={symbol.title}
              className="flex h-9 w-full items-center justify-center rounded-lg border border-border bg-white font-mono text-base font-bold text-text transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary sm:size-9"
              key={symbol.title}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                insertSymbol(symbol.value);
              }}
              title={symbol.title}
              type="button"
            >
              {symbol.label}
            </button>
          ))}

          <div className="ml-auto hidden text-xs text-text-muted md:block">
            También puedes usar <code className="font-mono font-bold">| &amp; ! -</code>
          </div>
        </div>
      </div>
    </section>
  );
}
