import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { Check, CircleAlert, Sigma, X } from "lucide-react";

import {
  getSelectedRegionsExpression,
  parseVennExpression,
  prepareDiagramExpressions,
  VennExpressionError,
} from "@/domain/venn/expressions";

import { useVennStore } from "@/state/venn-store";

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

export function FormulaBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditingRef = useRef(false);

  const diagram = useVennStore((state) => state.diagram);

  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);

  const setRegionSelection = useVennStore((state) => state.setRegionSelection);

  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const [formula, setFormula] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedExpression = useMemo(
    () => getSelectedRegionsExpression(diagram, selectedRegionIds),
    [diagram, selectedRegionIds],
  );

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

  const hasFormula = formula.trim().length > 0;
  const isValid = hasFormula && !error;

  return (
    <section
      aria-label="Editor de fórmula"
      className="rounded-xl border border-border bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
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
                "w-full border-0 bg-transparent pr-10 font-mono text-lg font-bold text-ink outline-none",
                "placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-text-muted",
              ].join(" ")}
              id="venn-formula"
              onBlur={() => {
                isEditingRef.current = false;
              }}
              onChange={handleChange}
              onFocus={() => {
                isEditingRef.current = true;
              }}
              placeholder="Ejemplo: (A ∪ B) ∩ C'"
              spellCheck={false}
              type="text"
              value={formula}
            />

            {isValid && (
              <Check
                aria-hidden="true"
                className="absolute right-1 top-1/2 size-5 -translate-y-1/2 text-emerald-600"
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

        {(hasFormula || selectedRegionIds.length > 0) && (
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-text-muted transition-colors hover:bg-surface hover:text-ink"
            onClick={clearFormula}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
        <span className="mr-1 text-xs font-bold uppercase tracking-widest text-text-muted">
          Insertar
        </span>

        {FORMULA_SYMBOLS.map((symbol) => (
          <button
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-white font-mono text-base font-bold text-ink transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
            key={symbol.title}
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
    </section>
  );
}
