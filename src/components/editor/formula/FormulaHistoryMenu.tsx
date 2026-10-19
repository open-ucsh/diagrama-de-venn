import { useDismissableLayer } from "@/hooks/use-dismissable-layer";
import { Check, Clock3, Copy, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";

const COPY_FEEDBACK_DURATION = 1_500;

interface FormulaHistoryMenuProps {
  formulas: string[];
  isAvailable: (formula: string) => boolean;
  onClear: () => void;
  onDelete: (formula: string) => void;
  onSelect: (formula: string) => void;
}

export function FormulaHistoryMenu({
  formulas,
  isAvailable,
  onClear,
  onDelete,
  onSelect,
}: FormulaHistoryMenuProps) {
  const panelId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyRequestRef = useRef(0);

  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useKeyboardShortcut({
    code: "Digit3",
    shift: true,
    onTrigger: () => {
      const details = detailsRef.current;

      if (!details) {
        return;
      }

      details.open = !details.open;
      details.querySelector("summary")?.focus();
    },
  });

  const closeMenu = useCallback((restoreFocus: boolean): void => {
    const details = detailsRef.current;

    if (!details) {
      return;
    }

    details.open = false;

    if (restoreFocus) {
      details.querySelector("summary")?.focus();
    }
  }, []);

  useDismissableLayer({
    containerRef: detailsRef,
    isOpen: () => detailsRef.current?.open ?? false,
    onDismiss: closeMenu,
  });

  useEffect(() => {
    return () => {
      copyRequestRef.current += 1;

      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  function resetCopyFeedback(): void {
    copyRequestRef.current += 1;

    if (copyTimeoutRef.current !== null) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    setCopiedFormula(null);
    setAnnouncement("");
  }

  function handleSelect(formula: string): void {
    if (!isAvailable(formula)) {
      return;
    }

    onSelect(formula);
    closeMenu(true);
  }

  function handleClear(): void {
    onClear();
    resetCopyFeedback();
    closeMenu(true);
  }

  function handleDelete(formula: string): void {
    onDelete(formula);
    resetCopyFeedback();
  }

  async function copyFormula(formula: string): Promise<void> {
    const request = ++copyRequestRef.current;

    if (copyTimeoutRef.current !== null) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    setCopiedFormula(null);
    setAnnouncement("");

    try {
      await navigator.clipboard.writeText(formula);

      if (request !== copyRequestRef.current) {
        return;
      }

      setCopiedFormula(formula);
      setAnnouncement("Fórmula copiada.");

      copyTimeoutRef.current = setTimeout(() => {
        copyTimeoutRef.current = null;
        setCopiedFormula(null);
      }, COPY_FEEDBACK_DURATION);
    } catch {
      if (request !== copyRequestRef.current) {
        return;
      }

      setAnnouncement("No fue posible copiar la fórmula.");
    }
  }

  return (
    <details className="group relative shrink-0" ref={detailsRef}>
      <summary
        aria-controls={panelId}
        aria-label="Abrir historial de fórmulas"
        aria-keyshortcuts="Control+Shift+3 Meta+Shift+3"
        className="flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary [&::-webkit-details-marker]:hidden"
        title="Historial de fórmulas (Ctrl/Cmd + Shift + 3)"
      >
        <Clock3 aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Historial</span>

        {formulas.length > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-brand-primary/10 px-1 text-xs font-semibold text-brand-primary">
            {formulas.length}
          </span>
        )}
      </summary>

      <div
        className="fixed right-3 bottom-28 left-3 z-50 overflow-hidden rounded-xl border border-border bg-white shadow-[0_12px_36px_rgba(20,43,74,0.16)] group-open:block sm:absolute sm:right-0 sm:bottom-full sm:left-auto sm:mb-2 sm:w-104"
        id={panelId}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text">Fórmulas recientes</p>
            <p className="mt-0.5 text-xs text-text-muted">Pulsa una fórmula para aplicarla.</p>
          </div>

          {formulas.length > 0 && (
            <button
              aria-label="Borrar todo el historial"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={handleClear}
              title="Borrar todo el historial"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              <span>Borrar historial</span>
            </button>
          )}
        </header>

        <p aria-atomic="true" className="sr-only" role="status">
          {announcement}
        </p>

        {formulas.length > 0 ? (
          <ol className="max-h-[min(55dvh,24rem)] overflow-y-auto p-2">
            {formulas.map((formula, index) => {
              const available = isAvailable(formula);
              const copied = copiedFormula === formula;

              return (
                <li className="flex items-center gap-1 rounded-md hover:bg-surface" key={formula}>
                  <button
                    className={[
                      "min-w-0 flex-1 rounded-md px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary",
                      available ? "cursor-pointer" : "cursor-not-allowed opacity-45",
                    ].join(" ")}
                    disabled={!available}
                    onClick={() => handleSelect(formula)}
                    title={
                      available
                        ? "Aplicar fórmula"
                        : "Esta fórmula utiliza conjuntos que no existen en el diagrama actual."
                    }
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="shrink-0 font-mono text-[11px] font-medium text-text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm leading-5 font-medium break-all text-text">
                          {formula}
                        </span>

                        {!available && (
                          <span className="mt-1 block text-xs font-medium text-red-600">
                            Conjunto no disponible
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 pr-1">
                    <button
                      aria-label={copied ? "Fórmula copiada" : "Copiar fórmula"}
                      className={[
                        "grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary",
                        copied
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-text-muted hover:bg-white hover:text-brand-primary",
                      ].join(" ")}
                      onClick={() => void copyFormula(formula)}
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
                      aria-label="Borrar fórmula del historial"
                      className="grid size-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
                      onClick={() => handleDelete(formula)}
                      title="Borrar fórmula"
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
            <Clock3 aria-hidden="true" className="mx-auto size-5 text-text-muted/50" />
            <p className="mt-2 text-sm text-text-muted">Todavía no hay fórmulas guardadas.</p>
          </div>
        )}
      </div>
    </details>
  );
}
