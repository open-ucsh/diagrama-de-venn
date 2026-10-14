import { Check, CircleAlert, LoaderCircle, Sigma, X } from "lucide-react";

import { FormulaElements } from "./FormulaElements";
import { FormulaHistoryMenu } from "./FormulaHistoryMenu";
import { useFormulaEditor } from "./use-formula-editor";

const FORMULA_SYMBOLS = [
  { label: "∪", value: " ∪ ", title: "Unión" },
  { label: "∩", value: " ∩ ", title: "Intersección" },
  { label: "\\", value: " \\ ", title: "Diferencia" },
  { label: "△", value: " △ ", title: "Diferencia simétrica" },
  { label: "'", value: "'", title: "Complemento" },
  { label: "(", value: "(", title: "Abrir paréntesis" },
  { label: ")", value: ")", title: "Cerrar paréntesis" },
] as const;

export function FormulaBar() {
  const {
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
  } = useFormulaEditor();

  const statusError = error ?? calculationError;

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
              onBlur={finishEditing}
              onChange={handleChange}
              onFocus={beginEditing}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  recordFormula(formula);
                }
              }}
              placeholder={isCalculating ? "Buscando fórmula mínima…" : "Ejemplo: (A ∪ B) ∩ C'"}
              spellCheck={false}
              type="text"
              value={formula}
            />

            {hasFormula && (
              <button
                aria-label="Limpiar fórmula"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                onMouseDown={(event) => event.preventDefault()}
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
          aria-atomic="true"
          aria-live={statusError ? "assertive" : "polite"}
          className="venn-formula-bar__status flex min-h-8 items-center"
          id="venn-formula-status"
          role={statusError ? "alert" : "status"}
        >
          {statusError ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
              {statusError}
            </p>
          ) : isCalculating ? (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
              Buscando fórmula mínima…
            </p>
          ) : isValid ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check aria-hidden="true" className="size-3.5" />
              {isMinimum ? "Fórmula mínima" : "Fórmula válida"}
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

        <FormulaElements formula={formula} />
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
