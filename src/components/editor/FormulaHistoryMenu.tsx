import { useRef, useState } from "react";

import { Check, Clock3, Copy, Trash2 } from "lucide-react";

interface Props {
  formulas: string[];
  isAvailable: (formula: string) => boolean;
  onClear: () => void;
  onDelete: (formula: string) => void;
  onSelect: (formula: string) => void;
}

export function FormulaHistoryMenu({ formulas, isAvailable, onClear, onDelete, onSelect }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
  }

  function handleSelect(formula: string) {
    if (!isAvailable(formula)) {
      return;
    }

    onSelect(formula);
    closeMenu();
  }

  async function copyFormula(formula: string) {
    try {
      await navigator.clipboard.writeText(formula);

      setCopiedFormula(formula);

      window.setTimeout(() => {
        setCopiedFormula((currentFormula) => (currentFormula === formula ? null : currentFormula));
      }, 1_500);
    } catch {
      setCopiedFormula(null);
    }
  }

  return (
    <details className="group relative" ref={detailsRef}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-text-muted transition-colors hover:bg-surface hover:text-ink">
        <Clock3 aria-hidden="true" className="size-4" />
        Historial
        {formulas.length > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-brand-primary/10 text-xs text-brand-primary">
            {formulas.length}
          </span>
        )}
      </summary>

      <div className="absolute top-full right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-xl sm:w-96">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Fórmulas recientes
            </p>

            <p className="mt-1 text-xs text-text-muted">Selecciona una para volver a aplicarla.</p>
          </div>

          {formulas.length > 0 && (
            <button
              aria-label="Borrar todo el historial"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                onClear();
                closeMenu();
              }}
              title="Borrar todo el historial"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          )}
        </header>

        {formulas.length > 0 ? (
          <ol className="max-h-80 overflow-y-auto p-2">
            {formulas.map((formula, index) => {
              const available = isAvailable(formula);

              const copied = copiedFormula === formula;

              return (
                <li
                  className="group/formula flex items-start gap-1 rounded-lg transition-colors hover:bg-surface"
                  key={formula}
                >
                  <button
                    className={[
                      "flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-3 text-left",
                      available ? "" : "cursor-not-allowed opacity-45",
                    ].join(" ")}
                    disabled={!available}
                    onClick={() => {
                      handleSelect(formula);
                    }}
                    title={
                      available
                        ? "Aplicar fórmula"
                        : "Esta fórmula utiliza conjuntos que no existen en el diagrama actual."
                    }
                    type="button"
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block break-all whitespace-normal font-mono text-sm font-bold leading-5 text-ink">
                        {formula}
                      </span>

                      {!available && (
                        <span className="mt-1 block text-xs font-medium text-red-600">
                          Conjunto no disponible
                        </span>
                      )}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 py-2 pr-2">
                    <button
                      aria-label={copied ? "Fórmula copiada" : "Copiar fórmula"}
                      className={[
                        "grid size-8 place-items-center rounded-lg transition-colors",
                        copied
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-text-muted hover:bg-white hover:text-brand-primary",
                      ].join(" ")}
                      onClick={() => {
                        void copyFormula(formula);
                      }}
                      title={copied ? "Copiada" : "Copiar fórmula"}
                      type="button"
                    >
                      {copied ? (
                        <Check aria-hidden="true" className="size-4" />
                      ) : (
                        <Copy aria-hidden="true" className="size-4" />
                      )}
                    </button>

                    <button
                      aria-label="Eliminar fórmula del historial"
                      className="grid size-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        onDelete(formula);
                      }}
                      title="Eliminar del historial"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="px-5 py-8 text-center">
            <Clock3 aria-hidden="true" className="mx-auto size-6 text-text-muted/50" />

            <p className="mt-3 text-sm font-medium text-text-muted">
              Todavía no hay fórmulas guardadas.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
