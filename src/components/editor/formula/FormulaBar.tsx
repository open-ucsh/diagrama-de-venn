import { CircleAlert, LoaderCircle, Sigma, X } from "lucide-react";
import { type KeyboardEvent, useId } from "react";

import { FormulaElements } from "@/components/editor/formula/FormulaElements";
import { FormulaHistoryMenu } from "@/components/editor/formula/FormulaHistoryMenu";
import { useFormulaEditor } from "@/components/editor/formula/use-formula-editor";
import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";

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
  const inputId = useId();
  const statusId = useId();

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
  const selectedCount = selectedRegionIds.length;

  useKeyboardShortcut({
    code: "Slash",
    onTrigger: () => {
      inputRef.current?.focus();
    },
  });

  useKeyboardShortcut({
    code: "Backspace",
    shift: true,
    enabled: hasFormula || selectedCount > 0,
    onTrigger: clearFormula,
  });

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    recordFormula(formula);
  }

  return (
    <section aria-label="Editor de fórmula" className="venn-formula-bar">
      <div className="venn-formula-toolbar">
        <label
          className="grid size-8 shrink-0 place-items-center text-brand-primary"
          htmlFor={inputId}
        >
          <Sigma aria-hidden="true" className="size-5" />
          <span className="sr-only">Expresión</span>
        </label>

        <div className="relative min-w-0 flex-1">
          <input
            aria-describedby={statusId}
            aria-invalid={Boolean(error)}
            aria-keyshortcuts="Control+/ Meta+/"
            autoComplete="off"
            className="venn-formula-input"
            id={inputId}
            onBlur={finishEditing}
            onChange={handleChange}
            onFocus={beginEditing}
            onKeyDown={handleKeyDown}
            placeholder="Ejemplo: A ∪ B"
            ref={inputRef}
            spellCheck={false}
            title="Enfocar fórmula (Ctrl/Cmd + /)"
            type="text"
            value={formula}
          />

          {hasFormula && (
            <button
              aria-label="Limpiar fórmula"
              aria-keyshortcuts="Control+Shift+Backspace Meta+Shift+Backspace"
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-text-muted hover:bg-surface-hover"
              onClick={clearFormula}
              onMouseDown={(event) => event.preventDefault()}
              title="Limpiar fórmula (Ctrl/Cmd + Shift + Backspace)"
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>

        <div aria-label="Operadores" className="venn-formula-operators" role="group">
          {FORMULA_SYMBOLS.map(({ label, value, title }) => (
            <button
              aria-label={title}
              className="venn-operator"
              key={title}
              onClick={() => insertSymbol(value)}
              onMouseDown={(event) => event.preventDefault()}
              title={title}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="venn-formula-history">
          <FormulaHistoryMenu
            formulas={formulaHistory}
            isAvailable={isHistoryFormulaAvailable}
            onClear={clearFormulaHistory}
            onDelete={deleteFormulaFromHistory}
            onSelect={applyHistoryFormula}
          />
        </div>
      </div>

      <div
        aria-atomic="true"
        className={statusError || isCalculating ? "venn-formula-feedback" : "sr-only"}
        id={statusId}
        role={statusError ? "alert" : "status"}
      >
        {statusError ? (
          <>
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {statusError}
          </>
        ) : isCalculating ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
            Buscando fórmula mínima…
          </>
        ) : isValid ? (
          `${isMinimum ? "Fórmula mínima" : "Fórmula válida"}. ${selectedCount} ${
            selectedCount === 1 ? "región seleccionada" : "regiones seleccionadas"
          }.`
        ) : (
          "Escribe una expresión o selecciona regiones en el diagrama."
        )}
      </div>

      {!statusError && !isCalculating && <FormulaElements formula={formula} />}
    </section>
  );
}
